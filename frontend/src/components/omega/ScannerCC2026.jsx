import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CheckCircle2, AlertCircle, WifiOff, Wifi, Loader2, RefreshCw, X } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const QUEUE_KEY = 'cc2026_scanner_queue_v1';
const EVENT_ID = 'CC2026';

// Cached badge types — résolu au boot, fallback statique si offline
const FALLBACK_BADGE_TYPES = {
  'CC26-ART': 'ARTISTE EN SCÈNE',
  'CC26-INT': 'INTERVENANT',
  'CC26-STF': 'STAFF',
  'CC26-BNV': 'BÉNÉVOLE',
  'CC26-PRS': 'PRESSE',
  'CC26-VIP': 'VIP',
  'CC26-OFF': 'OFFICIEL',
  'CC26-SPO': 'SPONSOR',
  'CC26-EXP1': 'EXPOSANT NIVEAU 1',
  'CC26-EXP2': 'EXPOSANT NIVEAU 2',
  'CC26-EXP3': 'EXPOSANT NIVEAU 3',
  'CC26-EXP4': 'EXPOSANT NIVEAU 4',
  'CC26-EXP5': 'EXPOSANT NIVEAU 5',
  'CC26-EXP6': 'EXPOSANT NIVEAU 6',
  'CC26-EXP7': 'EXPOSANT NIVEAU 7',
};

const loadQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveQueue = (q) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));

const ScannerCC2026 = () => {
  const [badgeTypes, setBadgeTypes] = useState(FALLBACK_BADGE_TYPES);
  const [selectedBadgeType, setSelectedBadgeType] = useState('CC26-BNV');
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { ok, frek_id, badge_type, reused, error }
  const [queueCount, setQueueCount] = useState(loadQueue().length);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ── Refresh badge types from API (best-effort)
  useEffect(() => {
    fetch(`${API}/api/frek/badge-types`)
      .then((r) => r.ok && r.json())
      .then((d) => d && d.badge_types && setBadgeTypes(d.badge_types))
      .catch(() => {});
  }, []);

  // ── Online/offline listeners
  useEffect(() => {
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener('online', onOn);
    window.addEventListener('offline', onOff);
    return () => {
      window.removeEventListener('online', onOn);
      window.removeEventListener('offline', onOff);
    };
  }, []);

  // ── Register one ticket (online) or queue (offline)
  const submitTicket = useCallback(async (qr_content, badge_type) => {
    if (!online) {
      const q = loadQueue();
      q.push({ qr_content, badge_type, event_id: EVENT_ID, ts: Date.now() });
      saveQueue(q);
      setQueueCount(q.length);
      setLastResult({ ok: true, queued: true, badge_type });
      return;
    }
    try {
      const r = await fetch(`${API}/api/frek/register-silent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_qr_content: qr_content, event_id: EVENT_ID, badge_type }),
      });
      const d = await r.json();
      if (!r.ok) {
        setLastResult({ ok: false, error: d.detail || 'Erreur serveur' });
        return;
      }
      setLastResult({ ok: true, frek_id: d.frek_id, badge_type: d.badge_type, reused: d.reused });
    } catch (e) {
      // Réseau qui tombe pendant le call → queue
      const q = loadQueue();
      q.push({ qr_content, badge_type, event_id: EVENT_ID, ts: Date.now() });
      saveQueue(q);
      setQueueCount(q.length);
      setLastResult({ ok: true, queued: true, badge_type });
    }
  }, [online]);

  // ── Drain queue when back online
  const syncQueue = useCallback(async () => {
    const q = loadQueue();
    if (q.length === 0 || !online || syncing) return;
    setSyncing(true);
    const remaining = [];
    for (const job of q) {
      try {
        const r = await fetch(`${API}/api/frek/register-silent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            external_qr_content: job.qr_content,
            event_id: job.event_id || EVENT_ID,
            badge_type: job.badge_type,
          }),
        });
        if (!r.ok) remaining.push(job);
      } catch {
        remaining.push(job);
      }
    }
    saveQueue(remaining);
    setQueueCount(remaining.length);
    setSyncing(false);
  }, [online, syncing]);

  useEffect(() => {
    if (online && queueCount > 0) {
      syncQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // ── QR scanning via BarcodeDetector (native) — fallback : input manuel
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopScanRef = useRef(false);

  const stopCamera = useCallback(() => {
    stopScanRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    if (!('BarcodeDetector' in window)) {
      setShowManual(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      stopScanRef.current = false;
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

      const loop = async () => {
        if (stopScanRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const code = codes[0].rawValue;
            stopCamera();
            await submitTicket(code, selectedBadgeType);
            return;
          }
        } catch {}
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      setShowManual(true);
      setLastResult({ ok: false, error: 'Caméra inaccessible — saisie manuelle activée' });
    }
  }, [selectedBadgeType, submitTicket, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) return;
    await submitTicket(manualInput.trim(), selectedBadgeType);
    setManualInput('');
  };

  const resetResult = () => setLastResult(null);

  // ── UI
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0a0a0b', color: '#E8D5A0', fontFamily: 'DM Sans, system-ui, sans-serif' }}
      data-testid="scanner-cc2026"
    >
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(232,213,160,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center" style={{ background: '#E8D5A0', color: '#0a0a0b', fontWeight: 900, fontSize: 14 }}>
            CVLN
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-wider">SCANNER CC2026</span>
            <span className="text-[10px] opacity-50">Implantation silencieuse</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {online ? (
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-70">
              <Wifi className="w-3.5 h-3.5" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider" style={{ color: '#ff8a65' }}>
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </span>
          )}
        </div>
      </header>

      {/* Badge type selector */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(232,213,160,0.08)' }}>
        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Type de badge à attribuer</label>
        <select
          value={selectedBadgeType}
          onChange={(e) => setSelectedBadgeType(e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-transparent border outline-none"
          style={{ borderColor: 'rgba(232,213,160,0.25)', color: '#E8D5A0' }}
          data-testid="scanner-badge-select"
        >
          {Object.entries(badgeTypes).map(([code, label]) => (
            <option key={code} value={code} style={{ background: '#0a0a0b' }}>
              {code} — {label}
            </option>
          ))}
        </select>
      </div>

      {/* Main */}
      <main className="flex-1 px-5 py-6 flex flex-col gap-4">
        {scanning && (
          <div className="relative w-full aspect-square max-w-md mx-auto overflow-hidden" style={{ background: '#000' }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 pointer-events-none" style={{ border: '2px solid #E8D5A0', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5) inset' }}>
              <div className="absolute inset-12 border-2" style={{ borderColor: '#E8D5A0' }} />
            </div>
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/60 hover:bg-black/80"
              data-testid="scanner-cancel-btn"
            >
              <X className="w-4 h-4" style={{ color: '#E8D5A0' }} />
            </button>
          </div>
        )}

        {!scanning && !showManual && (
          <button
            onClick={startScan}
            className="w-full py-6 flex items-center justify-center gap-3 transition-opacity hover:opacity-90"
            style={{ background: '#E8D5A0', color: '#0a0a0b', letterSpacing: '0.1em', fontWeight: 900, fontSize: 14 }}
            data-testid="scanner-start-btn"
          >
            <Camera className="w-5 h-5" /> SCANNER UN BILLET
          </button>
        )}

        {!scanning && (
          <button
            onClick={() => setShowManual((v) => !v)}
            className="text-xs underline opacity-60 hover:opacity-100"
            data-testid="scanner-toggle-manual"
          >
            {showManual ? 'Annuler saisie manuelle' : 'Saisie manuelle'}
          </button>
        )}

        {showManual && (
          <div className="flex flex-col gap-2">
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              placeholder="Coller / saisir le contenu du QR"
              className="w-full px-3 py-3 bg-transparent border text-sm outline-none"
              style={{ borderColor: 'rgba(232,213,160,0.25)', color: '#E8D5A0' }}
              data-testid="scanner-manual-input"
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              className="px-4 py-3 text-xs font-bold tracking-wider uppercase disabled:opacity-40"
              style={{ background: '#E8D5A0', color: '#0a0a0b' }}
              data-testid="scanner-manual-submit"
            >
              Valider
            </button>
          </div>
        )}

        {/* Last result */}
        {lastResult && (
          <div
            className="mt-4 border p-5"
            style={{ borderColor: lastResult.ok ? 'rgba(126,217,87,0.4)' : 'rgba(255,138,101,0.4)' }}
            data-testid="scanner-last-result"
          >
            <div className="flex items-start gap-3">
              {lastResult.ok ? (
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: '#7ED957' }} />
              ) : (
                <AlertCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#ff8a65' }} />
              )}
              <div className="flex-1">
                {lastResult.queued ? (
                  <>
                    <div className="text-xs uppercase tracking-widest opacity-60">Mis en file offline</div>
                    <div className="font-mono text-base mt-1">{lastResult.badge_type}</div>
                    <div className="text-xs opacity-50 mt-1">Sera synchronisé au retour réseau.</div>
                  </>
                ) : lastResult.ok ? (
                  <>
                    <div className="text-xs uppercase tracking-widest opacity-60">
                      {lastResult.reused ? 'Déjà enregistré' : 'Implantation réussie'}
                    </div>
                    <div className="font-mono text-xl mt-1" style={{ letterSpacing: '0.05em' }} data-testid="scanner-result-frek-id">
                      {lastResult.frek_id}
                    </div>
                    <div className="text-sm mt-2 opacity-80">
                      ✅ {lastResult.badge_type} — {badgeTypes[lastResult.badge_type] || ''}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs uppercase tracking-widest" style={{ color: '#ff8a65' }}>Erreur</div>
                    <div className="text-sm mt-1">{lastResult.error}</div>
                  </>
                )}
              </div>
              <button onClick={resetResult} className="opacity-40 hover:opacity-80" data-testid="scanner-clear-result">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer queue indicator */}
      <footer className="px-5 py-4 border-t flex items-center justify-between text-xs" style={{ borderColor: 'rgba(232,213,160,0.1)' }} data-testid="scanner-queue-bar">
        <span className="opacity-60">
          Queue offline : <span className="font-mono font-bold" data-testid="scanner-queue-count">{queueCount}</span> en attente
        </span>
        {queueCount > 0 && online && (
          <button
            onClick={syncQueue}
            disabled={syncing}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider underline"
            data-testid="scanner-sync-btn"
          >
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Synchroniser
          </button>
        )}
      </footer>
    </div>
  );
};

export default ScannerCC2026;
