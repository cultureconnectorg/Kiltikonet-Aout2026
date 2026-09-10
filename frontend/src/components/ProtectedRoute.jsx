import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { BACKEND_URL } from '../config/api';

const API = BACKEND_URL;

// Session expiration times (for display cache only — real auth is httpOnly cookie)
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

// Storage key — sessionStorage only (per-tab, not persistent across tabs)
const SESSION_KEY = 'cc2026_session';

/**
 * Get cached session from sessionStorage (display info only — auth is via cookie)
 */
export const getSession = () => {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      const session = JSON.parse(raw);
      if (session.createdAt && (Date.now() - session.createdAt) < SESSION_EXPIRY_MS) {
        return { session, persistent: false };
      }
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
  return { session: null, persistent: false };
};

/**
 * Cache session display data in sessionStorage (not localStorage)
 * Auth is handled by httpOnly cookie set by the backend
 */
export const saveSession = (sessionData, rememberMe = false) => {
  const session = {
    ...sessionData,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    rememberMe
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

/**
 * Check if display cache is expired
 */
export const isSessionExpired = () => {
  const { session } = getSession();
  if (!session) return true;
  if (session.createdAt && (Date.now() - session.createdAt) > SESSION_EXPIRY_MS) {
    return true;
  }
  return false;
};

/**
 * Update last activity timestamp
 */
export const updateSessionActivity = () => {
  const { session } = getSession();
  if (!session) return;
  session.lastActivity = Date.now();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

/**
 * Clear session: call backend logout to delete httpOnly cookie + clear sessionStorage
 */
export const expireSession = async (message = "Session expirée, reconnectez-vous") => {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('workspace_user');
  try {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch { /* silent */ }
  if (message) {
    toast.error(message);
  }
};

/**
 * Check auth via httpOnly cookie (server-side verification)
 */
export const checkCookieAuth = async () => {
  try {
    const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) return data.session;
    }
  } catch { /* silent */ }
  return null;
};

/**
 * Protected Route Component — cookie-based auth
 */
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'authenticated' | 'unauthenticated'
  const [sessionData, setSessionData] = useState(null);

  const verify = useCallback(async () => {
    // The display cache is user-editable and cannot authorize a route.
    // Verify the signed cookie with the server before rendering children.
    const cookieSession = await checkCookieAuth();
    if (cookieSession) {
      // Cache for subsequent renders
      saveSession({ name: cookieSession.name, role: cookieSession.role, email: cookieSession.email });
      setSessionData(cookieSession);
      setAuthState('authenticated');
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      setSessionData(null);
      setAuthState('unauthenticated');
    }
  }, []);

  useEffect(() => { verify(); }, [verify]);

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F1EA' }}>
        <div className="animate-pulse text-sm text-charcoal/50 font-syne">Verification...</div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <Navigate to="/admin" state={{ from: location, requireAuth: true }} replace />;
  }

  // Check role
  if (allowedRoles.length > 0 && sessionData && !allowedRoles.includes(sessionData.role)) {
    return <Navigate to="/admin" state={{ from: location, unauthorized: true }} replace />;
  }

  return children;
};

/**
 * Hook to check auth status
 */
export const useAuth = () => {
  const { session } = getSession();

  if (session && !isSessionExpired()) {
    updateSessionActivity();
    return {
      isAuthenticated: true,
      user: session,
      type: session.role === 'admin' ? 'admin' : 'workspace',
      expired: false,
      persistent: false,
      isFounder: session.role === 'founder',
      isAdmin: session.role === 'admin'
    };
  }

  return { isAuthenticated: false, user: null, type: null, expired: false, persistent: false };
};

export default ProtectedRoute;
