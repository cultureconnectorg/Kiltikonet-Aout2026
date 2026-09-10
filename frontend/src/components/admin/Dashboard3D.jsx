import React, { useState, useRef } from 'react';
// Retained 3D components; the existing dashboard still renders its 2D fallback.
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox, OrbitControls, Float } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Badge, Users, BarChart3, Brain, Edit3, List, Settings, ChevronRight } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  charbon: '#1C1A14',
  terracotta: '#C4714A',
  gold: '#D4A84B',
  forest: '#4A5D4E',
  burgundy: '#8B1A4A',
  teal: '#0B6E7A'
};

const PANELS = [
  { id: 'accreditation', label: 'Accréditation', icon: Badge, color: COLORS.burgundy, route: '/admin/accreditation' },
  { id: 'workspaces', label: 'Équipe', icon: Users, color: COLORS.gold, route: '/admin/dashboard' },
  { id: 'observatoire', label: 'Observatoire', icon: BarChart3, color: COLORS.forest, route: '/admin/accreditation?tab=stats' },
  { id: 'smart-engine', label: 'Smart Engine', icon: Brain, color: COLORS.teal, route: '/smart-engine' },
  { id: 'cms', label: 'CMS', icon: Edit3, color: '#BB8FCE', route: '/admin/cms' },
  { id: 'logs', label: 'Logs', icon: List, color: '#7B9ECC', route: '/admin/logs' }
];

// ═══════════════════════════════════════════════════════════════
// 3D PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════
const Panel3D = ({ panel, index, total, onSelect, isSelected }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // Position panels in arc
  const angle = (index / (total - 1)) * Math.PI - Math.PI / 2;
  const radius = 4;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius - 2;
  const y = 0;
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle hover animation
      const targetScale = hovered ? 1.1 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      
      // Face center
      meshRef.current.lookAt(0, 0, 0);
      
      // Gentle float
      meshRef.current.position.y = y + Math.sin(state.clock.elapsedTime + index) * 0.05;
    }
  });
  
  return (
    <group position={[x, y, z]}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        <mesh
          ref={meshRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={() => onSelect(panel)}
        >
          <RoundedBox args={[1.8, 2.2, 0.15]} radius={0.1}>
            <meshStandardMaterial 
              color={hovered ? panel.color : '#2A2820'}
              emissive={panel.color}
              emissiveIntensity={hovered ? 0.3 : 0.1}
              metalness={0.3}
              roughness={0.7}
            />
          </RoundedBox>
          
          {/* Icon circle */}
          <mesh position={[0, 0.4, 0.08]}>
            <circleGeometry args={[0.35, 32]} />
            <meshStandardMaterial 
              color={panel.color}
              emissive={panel.color}
              emissiveIntensity={0.2}
            />
          </mesh>
          
          {/* Label */}
          <Text
            position={[0, -0.4, 0.08]}
            fontSize={0.18}
            color="#E8E8F0"
            anchorX="center"
            anchorY="middle"
            font="/fonts/Syne-Bold.woff"
          >
            {panel.label}
          </Text>
          
          {/* Glow ring when hovered */}
          {hovered && (
            <mesh position={[0, 0, -0.05]}>
              <ringGeometry args={[0.9, 1.0, 32]} />
              <meshBasicMaterial color={panel.color} transparent opacity={0.5} />
            </mesh>
          )}
        </mesh>
      </Float>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// CENTRAL HUB - CC2026 Logo
// ═══════════════════════════════════════════════════════════════
const CentralHub = () => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });
  
  return (
    <group position={[0, 0, 0]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.terracotta}
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.15}
        color={COLORS.gold}
        anchorX="center"
      >
        CC2026
      </Text>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// BACKGROUND PARTICLES
// ═══════════════════════════════════════════════════════════════
const Particles = () => {
  const particlesRef = useRef();
  const count = 200;
  
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.03} color={COLORS.gold} transparent opacity={0.4} />
    </points>
  );
};

// ═══════════════════════════════════════════════════════════════
// 3D SCENE
// ═══════════════════════════════════════════════════════════════
const Scene3D = ({ onPanelSelect }) => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#fff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={COLORS.terracotta} />
      
      <Particles />
      <CentralHub />
      
      {PANELS.map((panel, index) => (
        <Panel3D
          key={panel.id}
          panel={panel}
          index={index}
          total={PANELS.length}
          onSelect={onPanelSelect}
        />
      ))}
      
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 3}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// FALLBACK 2D DASHBOARD (for non-WebGL browsers)
// ═══════════════════════════════════════════════════════════════
const Dashboard2D = ({ onPanelSelect }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
      {PANELS.map((panel) => {
        const Icon = panel.icon;
        return (
          <button
            key={panel.id}
            onClick={() => onPanelSelect(panel)}
            className="group relative p-6 rounded-xl transition-all duration-300 hover:scale-105"
            style={{ 
              background: '#2A2820', 
              border: `1px solid ${panel.color}30`
            }}
            data-testid={`panel-${panel.id}`}
          >
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: `${panel.color}20` }}
            >
              <Icon className="w-8 h-8" style={{ color: panel.color }} />
            </div>
            <div className="text-lg font-bold text-white">{panel.label}</div>
            <div 
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${panel.color}10, transparent)` }}
            />
            <ChevronRight 
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: panel.color }}
            />
          </button>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY FOR 3D COMPONENTS (React 19 compatibility)
// ═══════════════════════════════════════════════════════════════
class ThreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD 3D COMPONENT
// ═══════════════════════════════════════════════════════════════
const Dashboard3D = ({ onNavigate }) => {
  // NOTE: Three.js disabled due to React 19 compatibility issues
  // Using 2D fallback exclusively until @react-three/fiber updates
  const navigate = useNavigate();
  
  const handlePanelSelect = (panel) => {
    if (onNavigate) {
      onNavigate(panel.route);
    } else {
      navigate(panel.route);
    }
  };
  
  return (
    <div className="min-h-screen" style={{ background: COLORS.charbon }}>
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold"
            style={{ background: `linear-gradient(135deg, ${COLORS.terracotta}, ${COLORS.burgundy})`, color: '#fff' }}
          >
            CC
          </div>
          <div>
            <div className="font-bold text-white tracking-wider">CULTURE CONNECT 2026</div>
            <div className="text-xs" style={{ color: COLORS.terracotta }}>Dashboard Admin</div>
          </div>
        </div>
        
        {/* Note about 3D mode */}
        <div className="text-xs px-3 py-1 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
          Vue classique active
        </div>
      </div>
      
      {/* Content */}
      <div className="h-[calc(100vh-100px)]">
        {/* 3D mode disabled due to React 19 compatibility - using 2D fallback */}
        <Dashboard2D onPanelSelect={handlePanelSelect} />
      </div>
      
      {/* Footer hint */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Cliquez sur une section pour y accéder
        </div>
      </div>
    </div>
  );
};

export default Dashboard3D;
