import React, { useRef, useEffect, useState, useCallback } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import axios from 'axios';
import { Loader2, RefreshCw, Maximize2, Minimize2, X, Brain, AlertCircle, RotateCcw } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_COLORS = {
  ART: [1.0, 0.843, 0.0],
  VIP: [0.608, 0.349, 0.714],
  STF: [0.204, 0.596, 0.859],
  SPO: [0.180, 0.800, 0.443],
  INT: [1.0, 1.0, 1.0],
  VIS: [0.0, 1.0, 1.0],
  BNV: [0.902, 0.494, 0.133],
  EXP: [1.0, 0.843, 0.0],
};
const TYPE_HEX = {
  ART: '#FFD700', VIP: '#9B59B6', STF: '#3498DB', SPO: '#2ECC71',
  INT: '#FFFFFF', VIS: '#00FFFF', BNV: '#E67E22', EXP: '#FFD700',
};
const TYPE_LABELS = {
  ART: 'Artiste', VIP: 'VIP', STF: 'Staff', SPO: 'Sponsor',
  INT: 'Institutionnel', VIS: 'Visiteur', BNV: 'Benevole', EXP: 'Exposant',
};
const DEFAULT_COLOR = [0.651, 0.365, 0.278];
const THREEJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const FRICTION = 0.95;
const TAP_THRESHOLD = 6;
const DOUBLE_TAP_MS = 350;
const LONG_PRESS_MS = 700;

function loadThreeJS() {
  return new Promise((resolve, reject) => {
    if (window.THREE) { resolve(window.THREE); return; }
    const s = document.createElement('script');
    s.src = THREEJS_CDN;
    s.onload = () => resolve(window.THREE);
    s.onerror = () => reject(new Error('Three.js CDN failed'));
    document.head.appendChild(s);
  });
}

function getColor(type) { return TYPE_COLORS[type] || DEFAULT_COLOR; }

function createGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.15, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}

const MgraphView = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const stateRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popup, setPopup] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, clusters: {} });
  const [webglOk, setWebglOk] = useState(true);
  const [isolated, setIsolated] = useState(null);
  const [fallbackNodes, setFallbackNodes] = useState([]);
  const [fallbackEdges, setFallbackEdges] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/smart-engine/mgraph`);
      return data;
    } catch {
      return { nodes: [], edges: [], total_nodes: 0, total_edges: 0, clusters: {} };
    }
  }, []);

  const renderFallback2D = useCallback((data) => {
    if (!data?.nodes?.length) return;
    const nodes = data.nodes.map((n, i) => ({
      ...n, x: 400 + Math.cos(i * 0.4) * (150 + n.score), y: 300 + Math.sin(i * 0.4) * (150 + n.score),
    }));
    const idMap = {};
    nodes.forEach((n, i) => { idMap[n.id] = i; });
    const edges = data.edges.filter(e => idMap[e.source] !== undefined && idMap[e.target] !== undefined);
    setFallbackNodes(nodes);
    setFallbackEdges(edges);
    setStats({ nodes: data.total_nodes, edges: data.total_edges, clusters: data.clusters || {} });
    setLoading(false);
  }, []);

  useEffect(() => {
    let disposed = false;
    let animId = null;
    let refreshTimer = null;

    const init = async () => {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglOk(false);
        const data = await fetchData();
        renderFallback2D(data);
        return;
      }

      let THREE;
      try { THREE = await loadThreeJS(); } catch {
        setWebglOk(false);
        const data = await fetchData();
        renderFallback2D(data);
        return;
      }

      const container = containerRef.current;
      const cvs = canvasRef.current;
      if (!container || !cvs || disposed) return;

      const W = container.clientWidth;
      const H = container.clientHeight || 600;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      scene.fog = new THREE.FogExp2(0x000000, 0.0008);

      // Camera
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);
      camera.position.set(0, 0, 350);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: false });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Lights — 4 sources
      scene.add(new THREE.AmbientLight(0x222222, 0.8));
      const l1 = new THREE.PointLight(0xFFD700, 1.0, 900); l1.position.set(250, 200, 250); scene.add(l1);
      const l2 = new THREE.PointLight(0x9B59B6, 0.7, 800); l2.position.set(-200, -150, 200); scene.add(l2);
      const l3 = new THREE.PointLight(0x3498DB, 0.5, 700); l3.position.set(0, -250, -150); scene.add(l3);
      const l4 = new THREE.DirectionalLight(0xF4F1EA, 0.3); l4.position.set(1, 1, 1); scene.add(l4);

      // Glow texture
      const glowTexture = new THREE.CanvasTexture(createGlowTexture());

      // Groups
      const nodeGroup = new THREE.Group();
      const edgeGroup = new THREE.Group();
      const particleGroup = new THREE.Group();
      scene.add(edgeGroup);
      scene.add(nodeGroup);
      scene.add(particleGroup);

      // === PARTICLES — Multi-layer floating gold dust ===
      const createParticleLayer = (count, spread, size, speed, opacity) => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          pos[i * 3] = (Math.random() - 0.5) * spread;
          pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
          pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
          vel[i * 3] = (Math.random() - 0.5) * speed;
          vel[i * 3 + 1] = (Math.random() - 0.5) * speed;
          vel[i * 3 + 2] = (Math.random() - 0.5) * speed;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
          color: 0xFFD700, size, transparent: true, opacity,
          map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const points = new THREE.Points(geo, mat);
        points.userData = { vel, speed, spread };
        particleGroup.add(points);
        return points;
      };
      const pLayers = [
        createParticleLayer(150, 700, 2.0, 0.08, 0.25),
        createParticleLayer(100, 500, 1.2, 0.05, 0.15),
        createParticleLayer(60, 900, 3.0, 0.03, 0.10),
      ];

      // State
      const st = {
        THREE, scene, camera, renderer, nodeGroup, edgeGroup, pLayers, glowTexture,
        nodeMeshes: [], nodeData: [], edgeLines: [], edgeMeta: [],
        rotation: { x: 0.3, y: 0 },
        velocity: { x: 0, y: 0 },
        autoRotate: true,
        mouse: { down: false, x: 0, y: 0, startX: 0, startY: 0, button: 0, moved: false },
        touch: { active: false, startDist: 0, startMid: { x: 0, y: 0 }, count: 0 },
        zoom: 350, targetZoom: 350,
        panX: 0, panY: 0, targetPanX: 0, targetPanY: 0,
        selectedNode: null, isolatedNode: null,
        lastTap: 0, longPressTimer: null, longPressFired: false,
        raycaster: new THREE.Raycaster(),
        mouseVec: new THREE.Vector2(),
        clock: new THREE.Clock(),
        hoveredNode: null,
      };
      stateRef.current = st;

      // === BUILD GRAPH ===
      const buildGraph = (data) => {
        if (disposed) return;
        // Clear
        while (nodeGroup.children.length) {
          const c = nodeGroup.children[0];
          if (c.children) c.children.forEach(ch => { ch.geometry?.dispose(); ch.material?.dispose(); });
          c.geometry?.dispose(); c.material?.dispose(); nodeGroup.remove(c);
        }
        while (edgeGroup.children.length) {
          const c = edgeGroup.children[0]; c.geometry?.dispose(); c.material?.dispose(); edgeGroup.remove(c);
        }
        st.nodeMeshes = []; st.nodeData = []; st.edgeLines = []; st.edgeMeta = [];

        if (!data?.nodes?.length) { setLoading(false); return; }

        // D3 force layout
        const simNodes = data.nodes.map(n => ({ ...n }));
        const idIndex = {};
        simNodes.forEach((n, i) => { idIndex[n.id] = i; });
        const simLinks = data.edges
          .filter(e => idIndex[e.source] !== undefined && idIndex[e.target] !== undefined)
          .map(e => ({ source: idIndex[e.source], target: idIndex[e.target], link_type: e.link_type, strength: e.strength || 0.3 }));

        const sim = forceSimulation(simNodes)
          .force('charge', forceManyBody().strength(-80))
          .force('link', forceLink(simLinks).distance(55).strength(d => d.strength))
          .force('center', forceCenter(0, 0))
          .force('collide', forceCollide(14))
          .stop();
        for (let i = 0; i < 250; i++) sim.tick();

        // Sphere geometry (shared)
        const sphereGeo = new THREE.SphereGeometry(1, 20, 20);

        simNodes.forEach((n, i) => {
          const col = getColor(n.type);
          const score = n.score || 0;
          const radius = 3.5 + score * 0.07;
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(col[0], col[1], col[2]),
            emissive: new THREE.Color(col[0] * 0.5, col[1] * 0.5, col[2] * 0.5),
            emissiveIntensity: 0.5 + score * 0.005,
            metalness: 0.4,
            roughness: 0.3,
            transparent: true,
            opacity: 1,
          });
          const mesh = new THREE.Mesh(sphereGeo, mat);
          mesh.scale.set(radius, radius, radius);
          const z = (score - 50) * 1.8;
          mesh.position.set(n.x || 0, n.y || 0, z);
          mesh.userData = { index: i, nodeId: n.id };
          nodeGroup.add(mesh);

          // Glow halo
          const spriteMat = new THREE.SpriteMaterial({
            map: glowTexture,
            color: new THREE.Color(col[0], col[1], col[2]),
            transparent: true, opacity: 0.35,
            blending: THREE.AdditiveBlending, depthWrite: false,
          });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.scale.set(radius * 4, radius * 4, 1);
          mesh.add(sprite);

          st.nodeMeshes.push(mesh);
          st.nodeData.push({ ...n, radius, baseEmissive: 0.5 + score * 0.005 });
        });

        // Edges with metadata
        simLinks.forEach((link, li) => {
          const si = typeof link.source === 'object' ? link.source.index : link.source;
          const ti = typeof link.target === 'object' ? link.target.index : link.target;
          const sn = simNodes[si]; const tn = simNodes[ti];
          if (!sn || !tn) return;

          const sz = ((sn.score || 0) - 50) * 1.8;
          const tz = ((tn.score || 0) - 50) * 1.8;
          const geom = new THREE.BufferGeometry();
          geom.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([sn.x, sn.y, sz, tn.x, tn.y, tz]), 3
          ));

          const baseOpacity = link.link_type === 'org' ? 0.22 : link.link_type === 'brain' ? 0.18 : 0.08;
          const color = link.link_type === 'org' ? 0xA65D47 : link.link_type === 'brain' ? 0x9B59B6 : 0xFFD700;
          const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: baseOpacity });
          const line = new THREE.Line(geom, mat);
          edgeGroup.add(line);
          st.edgeLines.push(line);
          st.edgeMeta.push({ sourceIdx: si, targetIdx: ti, link_type: link.link_type, baseOpacity });
        });

        setStats({ nodes: data.total_nodes, edges: data.total_edges, clusters: data.clusters || {} });
        setLoading(false);
      };

      // Load data
      const data = await fetchData();
      if (disposed) return;
      buildGraph(data);

      // Refresh every 30s
      refreshTimer = setInterval(async () => {
        const fresh = await fetchData();
        if (!disposed) buildGraph(fresh);
      }, 30000);

      // === ANIMATION LOOP ===
      const animate = () => {
        if (disposed) return;
        animId = requestAnimationFrame(animate);
        const t = st.clock.getElapsedTime();

        // Momentum — apply velocity with friction
        if (!st.mouse.down && !st.touch.active) {
          st.rotation.y += st.velocity.x;
          st.rotation.x += st.velocity.y;
          st.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, st.rotation.x));
          st.velocity.x *= FRICTION;
          st.velocity.y *= FRICTION;
          // Auto-rotate when velocity is near zero
          if (st.autoRotate && Math.abs(st.velocity.x) < 0.0005 && Math.abs(st.velocity.y) < 0.0005) {
            st.rotation.y += 0.0015;
          }
        }

        // Smooth zoom & pan
        st.zoom += (st.targetZoom - st.zoom) * 0.1;
        st.panX += (st.targetPanX - st.panX) * 0.1;
        st.panY += (st.targetPanY - st.panY) * 0.1;

        // === NODE PULSATION by Cultural Impact Score ===
        const isoIdx = st.isolatedNode;
        st.nodeMeshes.forEach((mesh, i) => {
          const nd = st.nodeData[i];
          if (!nd) return;
          const score = nd.score || 0;

          // Pulse speed: high score = faster + stronger
          const pulseFreq = 0.8 + score * 0.025;
          const pulseAmp = 0.08 + score * 0.004;
          const pulse = 1 + Math.sin(t * pulseFreq + i * 0.7) * pulseAmp;
          mesh.scale.set(nd.radius * pulse, nd.radius * pulse, nd.radius * pulse);

          // Emissive glow shift
          const glow = nd.baseEmissive + Math.sin(t * pulseFreq * 0.8 + i * 1.1) * 0.25;
          mesh.material.emissiveIntensity = Math.max(0.15, glow);

          // Isolation mode
          if (isoIdx !== null) {
            const isConnected = isoIdx === i || st.edgeMeta.some(
              e => (e.sourceIdx === isoIdx && e.targetIdx === i) || (e.targetIdx === isoIdx && e.sourceIdx === i)
            );
            mesh.material.opacity = isConnected ? 1 : 0.06;
            mesh.material.transparent = true;
            if (mesh.children[0]) mesh.children[0].material.opacity = isConnected ? 0.4 : 0.02;
          } else {
            mesh.material.opacity = 1;
            mesh.material.transparent = true;
            if (mesh.children[0]) mesh.children[0].material.opacity = 0.35;
          }

          // Hover highlight
          if (st.hoveredNode === i && isoIdx === null) {
            mesh.material.emissiveIntensity = Math.max(glow, 1.2);
            if (mesh.children[0]) mesh.children[0].material.opacity = 0.7;
          }
        });

        // Edge isolation + subtle pulse on brain links
        st.edgeLines.forEach((line, i) => {
          const meta = st.edgeMeta[i];
          if (!meta) return;
          if (isoIdx !== null) {
            const connected = meta.sourceIdx === isoIdx || meta.targetIdx === isoIdx;
            line.material.opacity = connected ? meta.baseOpacity * 3 : 0.01;
          } else {
            let op = meta.baseOpacity;
            if (meta.link_type === 'brain') op += Math.sin(t * 1.5 + i) * 0.04;
            line.material.opacity = op;
          }
        });

        // === PARTICLE ANIMATION — orbital floating ===
        st.pLayers.forEach((layer, li) => {
          const attr = layer.geometry.attributes.position;
          const { vel, speed, spread } = layer.userData;
          const half = spread / 2;
          for (let i = 0; i < attr.count; i++) {
            const i3 = i * 3;
            attr.array[i3] += vel[i3] + Math.sin(t * 0.3 + i * 0.2 + li) * speed * 0.5;
            attr.array[i3 + 1] += vel[i3 + 1] + Math.cos(t * 0.25 + i * 0.15 + li * 2) * speed * 0.5;
            attr.array[i3 + 2] += Math.sin(t * 0.15 + i * 0.3) * speed * 0.3;
            // Wrap around
            if (attr.array[i3] > half) attr.array[i3] = -half;
            if (attr.array[i3] < -half) attr.array[i3] = half;
            if (attr.array[i3 + 1] > half) attr.array[i3 + 1] = -half;
            if (attr.array[i3 + 1] < -half) attr.array[i3 + 1] = half;
            if (attr.array[i3 + 2] > half) attr.array[i3 + 2] = -half;
            if (attr.array[i3 + 2] < -half) attr.array[i3 + 2] = half;
          }
          attr.needsUpdate = true;
        });

        // Apply transforms
        camera.position.set(st.panX, st.panY, st.zoom);
        camera.lookAt(st.panX, st.panY, 0);
        nodeGroup.rotation.set(st.rotation.x, st.rotation.y, 0);
        edgeGroup.rotation.set(st.rotation.x, st.rotation.y, 0);
        particleGroup.rotation.y = st.rotation.y * 0.2;

        renderer.render(scene, camera);
      };
      animate();

      // === INTERACTION HELPERS ===
      const canvasXY = (e) => {
        const r = cvs.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const containerXY = (clientX, clientY) => {
        const r = container.getBoundingClientRect();
        return { x: clientX - r.left, y: clientY - r.top };
      };
      const raycast = (px, py) => {
        const r = cvs.getBoundingClientRect();
        st.mouseVec.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
        st.raycaster.setFromCamera(st.mouseVec, camera);
        const hits = st.raycaster.intersectObjects(st.nodeMeshes, false);
        return hits.length > 0 ? hits[0].object : null;
      };

      const doShowPopup = (nodeIdx, clientX, clientY) => {
        const nd = st.nodeData[nodeIdx];
        if (!nd) return;
        const pos = containerXY(clientX, clientY);
        setPopup({ ...nd, px: pos.x, py: pos.y });
        st.selectedNode = nodeIdx;
      };
      const doHidePopup = () => { setPopup(null); st.selectedNode = null; };

      const doIsolate = (nodeIdx) => {
        if (st.isolatedNode === nodeIdx) {
          st.isolatedNode = null;
          setIsolated(null);
        } else {
          st.isolatedNode = nodeIdx;
          const nd = st.nodeData[nodeIdx];
          setIsolated(nd ? nd.label : null);
        }
      };

      const doBrainAnalysis = async (nodeIdx, clientX, clientY) => {
        const nd = st.nodeData[nodeIdx];
        if (!nd) return;
        const pos = containerXY(clientX, clientY);
        setPopup({ ...nd, px: pos.x, py: pos.y, brainLoading: true });
        try {
          const res = await axios.post(`${API}/brain/analyse`, { badge_id: nd.id, frek_id: nd.frek_id });
          setPopup(prev => prev ? { ...prev, brainResult: res.data, brainLoading: false } : null);
        } catch {
          setPopup(prev => prev ? { ...prev, brainLoading: false, brainError: true } : null);
        }
      };

      // === MOUSE EVENTS ===
      const onMouseDown = (e) => {
        st.mouse.down = true;
        st.mouse.x = e.clientX; st.mouse.y = e.clientY;
        st.mouse.startX = e.clientX; st.mouse.startY = e.clientY;
        st.mouse.button = e.button;
        st.mouse.moved = false;
        st.velocity.x = 0; st.velocity.y = 0;
        st.autoRotate = false;
      };

      const onMouseMove = (e) => {
        // Hover detection
        if (!st.mouse.down) {
          const pos = canvasXY(e);
          const hit = raycast(pos.x, pos.y);
          const newHover = hit ? hit.userData.index : null;
          if (newHover !== st.hoveredNode) {
            st.hoveredNode = newHover;
            cvs.style.cursor = newHover !== null ? 'pointer' : 'grab';
          }
          return;
        }
        cvs.style.cursor = 'grabbing';
        const dx = e.clientX - st.mouse.x;
        const dy = e.clientY - st.mouse.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) st.mouse.moved = true;

        if (st.mouse.button === 0) {
          st.rotation.y += dx * 0.005;
          st.rotation.x += dy * 0.005;
          st.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, st.rotation.x));
          st.velocity.x = dx * 0.003;
          st.velocity.y = dy * 0.003;
        } else if (st.mouse.button === 2 || st.mouse.button === 1) {
          st.targetPanX -= dx * 0.5;
          st.targetPanY += dy * 0.5;
        }
        st.mouse.x = e.clientX; st.mouse.y = e.clientY;
      };

      const onMouseUp = (e) => {
        const wasDrag = st.mouse.moved || Math.hypot(e.clientX - st.mouse.startX, e.clientY - st.mouse.startY) > TAP_THRESHOLD;
        if (!wasDrag) {
          // TAP
          const pos = canvasXY(e);
          const hit = raycast(pos.x, pos.y);
          if (hit) {
            const now = Date.now();
            const idx = hit.userData.index;
            if (now - st.lastTap < DOUBLE_TAP_MS) {
              doIsolate(idx);
              doHidePopup();
            } else {
              doShowPopup(idx, e.clientX, e.clientY);
            }
            st.lastTap = now;
          } else {
            doHidePopup();
            if (st.isolatedNode !== null) doIsolate(st.isolatedNode);
          }
        }
        st.mouse.down = false;
        cvs.style.cursor = st.hoveredNode !== null ? 'pointer' : 'grab';
        setTimeout(() => { st.autoRotate = true; }, 4000);
      };

      const onWheel = (e) => {
        e.preventDefault();
        st.targetZoom = Math.max(80, Math.min(900, st.targetZoom + e.deltaY * 0.4));
      };
      const onCtx = (e) => e.preventDefault();

      // === TOUCH EVENTS ===
      const tDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const tMid = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

      const onTouchStart = (e) => {
        e.preventDefault();
        st.autoRotate = false;
        st.velocity.x = 0; st.velocity.y = 0;
        st.touch.count = e.touches.length;

        if (e.touches.length === 1) {
          const tc = e.touches[0];
          st.touch.active = true;
          st.mouse.x = tc.clientX; st.mouse.y = tc.clientY;
          st.mouse.startX = tc.clientX; st.mouse.startY = tc.clientY;
          st.mouse.down = true;
          st.mouse.moved = false;
          st.longPressFired = false;

          st.longPressTimer = setTimeout(() => {
            if (!st.mouse.moved) {
              st.longPressFired = true;
              const pos = canvasXY(tc);
              const hit = raycast(pos.x, pos.y);
              if (hit) doBrainAnalysis(hit.userData.index, tc.clientX, tc.clientY);
            }
          }, LONG_PRESS_MS);
        } else if (e.touches.length === 2) {
          clearTimeout(st.longPressTimer);
          st.touch.startDist = tDist(e.touches[0], e.touches[1]);
          st.touch.startMid = tMid(e.touches[0], e.touches[1]);
          st.mouse.moved = true;
        }
      };

      const onTouchMove = (e) => {
        e.preventDefault();
        clearTimeout(st.longPressTimer);

        if (e.touches.length === 1 && st.mouse.down) {
          const tc = e.touches[0];
          const dx = tc.clientX - st.mouse.x;
          const dy = tc.clientY - st.mouse.y;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) st.mouse.moved = true;
          st.rotation.y += dx * 0.005;
          st.rotation.x += dy * 0.005;
          st.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, st.rotation.x));
          st.velocity.x = dx * 0.003;
          st.velocity.y = dy * 0.003;
          st.mouse.x = tc.clientX; st.mouse.y = tc.clientY;
        } else if (e.touches.length === 2) {
          // Pinch zoom + pan
          const dist = tDist(e.touches[0], e.touches[1]);
          const mid = tMid(e.touches[0], e.touches[1]);
          const scale = st.touch.startDist / dist;
          st.targetZoom = Math.max(80, Math.min(900, st.targetZoom * scale));
          st.touch.startDist = dist;
          st.targetPanX -= (mid.x - st.touch.startMid.x) * 0.5;
          st.targetPanY += (mid.y - st.touch.startMid.y) * 0.5;
          st.touch.startMid = mid;
        }
      };

      const onTouchEnd = (e) => {
        clearTimeout(st.longPressTimer);
        if (e.touches.length === 0) {
          const wasDrag = st.mouse.moved || st.longPressFired;
          if (!wasDrag && st.touch.count === 1) {
            const tc = e.changedTouches[0];
            const pos = canvasXY(tc);
            const hit = raycast(pos.x, pos.y);
            if (hit) {
              const now = Date.now();
              const idx = hit.userData.index;
              if (now - st.lastTap < DOUBLE_TAP_MS) {
                doIsolate(idx);
                doHidePopup();
              } else {
                doShowPopup(idx, tc.clientX, tc.clientY);
              }
              st.lastTap = now;
            } else {
              doHidePopup();
              if (st.isolatedNode !== null) doIsolate(st.isolatedNode);
            }
          }
          st.mouse.down = false;
          st.touch.active = false;
          setTimeout(() => { st.autoRotate = true; }, 4000);
        }
      };

      // Resize
      const onResize = () => {
        if (disposed || !container) return;
        const nw = container.clientWidth;
        const nh = container.clientHeight || 600;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };

      cvs.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      cvs.addEventListener('wheel', onWheel, { passive: false });
      cvs.addEventListener('contextmenu', onCtx);
      cvs.addEventListener('touchstart', onTouchStart, { passive: false });
      cvs.addEventListener('touchmove', onTouchMove, { passive: false });
      cvs.addEventListener('touchend', onTouchEnd);
      window.addEventListener('resize', onResize);

      stateRef.current._cleanup = () => {
        disposed = true;
        if (animId) cancelAnimationFrame(animId);
        if (refreshTimer) clearInterval(refreshTimer);
        clearTimeout(st.longPressTimer);
        cvs.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        cvs.removeEventListener('wheel', onWheel);
        cvs.removeEventListener('contextmenu', onCtx);
        cvs.removeEventListener('touchstart', onTouchStart);
        cvs.removeEventListener('touchmove', onTouchMove);
        cvs.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('resize', onResize);
        st.nodeMeshes.forEach(m => {
          m.children?.forEach(ch => { ch.geometry?.dispose(); ch.material?.dispose(); });
          m.geometry?.dispose(); m.material?.dispose();
        });
        st.edgeLines.forEach(l => { l.geometry?.dispose(); l.material?.dispose(); });
        renderer.dispose();
      };
    };

    init().catch(err => { setError(err.message); setLoading(false); });
    return () => { if (stateRef.current._cleanup) stateRef.current._cleanup(); };
  }, [fetchData, renderFallback2D]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchData();
    if (!webglOk) { renderFallback2D(data); return; }
    setLoading(false);
  }, [fetchData, webglOk, renderFallback2D]);

  const resetView = useCallback(() => {
    const st = stateRef.current;
    if (st.rotation) {
      st.rotation.x = 0.3; st.rotation.y = 0;
      st.targetZoom = 350; st.targetPanX = 0; st.targetPanY = 0;
      st.velocity.x = 0; st.velocity.y = 0;
      st.isolatedNode = null;
      setIsolated(null);
      setPopup(null);
    }
  }, []);

  const toggleFullscreen = () => setFullscreen(f => !f);

  // 2D Fallback
  if (!webglOk) {
    const idMap = {};
    fallbackNodes.forEach((n, i) => { idMap[n.id] = i; });
    return (
      <div data-testid="mgraph-fallback-2d" className="relative bg-black rounded-lg overflow-hidden" style={{ height: fullscreen ? '100vh' : '600px' }}>
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <AlertCircle size={14} className="text-yellow-500" />
          <span className="text-xs text-[#888]">Mode 2D (WebGL indisponible)</span>
        </div>
        <svg width="100%" height="100%" viewBox="0 0 800 600">
          {fallbackEdges.map((e, i) => {
            const s = fallbackNodes[idMap[e.source]]; const t = fallbackNodes[idMap[e.target]];
            if (!s || !t) return null;
            return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#FFD700" strokeOpacity={0.1} />;
          })}
          {fallbackNodes.map((n, i) => (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={5 + n.score * 0.05} fill={TYPE_HEX[n.type] || '#A65D47'} opacity={0.8} />
              <text x={n.x} y={n.y + 15} textAnchor="middle" fill="#888" fontSize="8">{n.label}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="mgraph-3d-container"
      className={`relative bg-black rounded-lg overflow-hidden ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
      role={fullscreen ? 'dialog' : undefined}
      aria-modal={fullscreen ? 'true' : undefined}
      aria-label="Visualisation Mgraph 3D"
      style={{ height: fullscreen ? '100vh' : '600px' }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="text-xs font-bold text-[#F4F1EA] tracking-widest uppercase">Mgraph 3D</span>
          <span className="text-[10px] text-[#666]">{stats.nodes} noeuds / {stats.edges} liens</span>
          {loading && <Loader2 size={12} className="animate-spin text-[#A65D47]" />}
        </div>
        <div className="flex items-center gap-1 pointer-events-auto">
          {isolated && (
            <span className="text-[10px] text-[#9B59B6] bg-[#9B59B6]/10 px-2 py-0.5 rounded mr-2">
              Isole: {isolated}
            </span>
          )}
          <button onClick={resetView} className="p-1.5 rounded hover:bg-white/10 text-[#888] hover:text-[#F4F1EA] transition-colors" data-testid="mgraph-reset" title="Reinitialiser vue">
            <RotateCcw size={13} />
          </button>
          <button onClick={handleRefresh} className="p-1.5 rounded hover:bg-white/10 text-[#888] hover:text-[#F4F1EA] transition-colors" data-testid="mgraph-refresh">
            <RefreshCw size={13} />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 rounded hover:bg-white/10 text-[#888] hover:text-[#F4F1EA] transition-colors" data-testid="mgraph-fullscreen">
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5 pointer-events-none">
        {Object.entries(TYPE_HEX).map(([type, hex]) => (
          <div key={type} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hex, boxShadow: `0 0 6px ${hex}` }} />
            <span className="text-[9px] text-[#999]">{TYPE_LABELS[type] || type}</span>
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 z-10 text-[8px] text-[#444] pointer-events-none text-right leading-relaxed">
        Clic + drag : rotation | Scroll : zoom<br />
        Clic droit : pan | Clic noeud : profil<br />
        Double-clic : isoler | Long press : Laurent.ia
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} data-testid="mgraph-canvas" className="w-full h-full block" style={{ touchAction: 'none', cursor: 'grab' }} />

      {/* Popup */}
      {popup && (
        <div
          data-testid="mgraph-popup"
          className="absolute z-20 bg-[#1A1A1A]/95 backdrop-blur-md border border-[#333] rounded-lg p-4 shadow-2xl animate-in fade-in duration-200"
          style={{
            left: Math.min(Math.max(popup.px - 120, 8), (containerRef.current?.clientWidth || 800) - 260),
            top: Math.min(Math.max(popup.py - 80, 40), (containerRef.current?.clientHeight || 600) - 220),
            width: 250,
          }}
        >
          <button onClick={() => setPopup(null)} className="absolute top-2 right-2 text-[#555] hover:text-[#F4F1EA] transition-colors" data-testid="mgraph-popup-close"><X size={12} /></button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_HEX[popup.type] || '#A65D47', boxShadow: `0 0 10px ${TYPE_HEX[popup.type] || '#A65D47'}` }} />
            <div>
              <p className="text-sm font-bold text-[#F4F1EA] leading-tight">{popup.label || 'Inconnu'}</p>
              <p className="text-[9px]" style={{ color: TYPE_HEX[popup.type] }}>{TYPE_LABELS[popup.type] || popup.full_type}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-[#666]">FREK-ID</span>
              <span className="text-[#F4F1EA] font-mono text-[9px] bg-[#222] px-1.5 py-0.5 rounded">{popup.frek_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Cultural Impact</span>
              <span className="font-bold text-xs" style={{ color: popup.score >= 70 ? '#FFD700' : popup.score >= 40 ? '#E67E22' : '#888' }}>{popup.score}/100</span>
            </div>
            {popup.org && (
              <div className="flex justify-between">
                <span className="text-[#666]">Organisation</span>
                <span className="text-[#CCC] text-right max-w-[120px] truncate">{popup.org}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#666]">Statut</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] ${popup.statut === 'REMIS' ? 'bg-green-900/30 text-green-400' : 'bg-[#222] text-[#CCC]'}`}>{popup.statut}</span>
            </div>
            {/* Score bar */}
            <div className="mt-1 h-1.5 bg-[#222] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${popup.score}%`, background: `linear-gradient(90deg, ${TYPE_HEX[popup.type] || '#A65D47'}, #FFD700)` }} />
            </div>
          </div>

          {/* Laurent.ia */}
          {popup.brainLoading && (
            <div className="mt-3 pt-2 border-t border-[#222] flex items-center gap-2 text-[10px] text-[#9B59B6]">
              <Loader2 size={10} className="animate-spin" /> Analyse CVL BRAIN en cours...
            </div>
          )}
          {popup.brainResult && (
            <div className="mt-3 pt-2 border-t border-[#222]">
              <div className="flex items-center gap-1 text-[10px] text-[#9B59B6] font-bold mb-1.5"><Brain size={10} /> CVL BRAIN</div>
              <p className="text-[9px] text-[#999] leading-relaxed">{popup.brainResult.justification_score || popup.brainResult.message || 'Analyse completee'}</p>
              {popup.brainResult.cultural_impact_score && (
                <p className="text-[10px] mt-1 text-[#FFD700] font-bold">Score BRAIN: {popup.brainResult.cultural_impact_score}/100</p>
              )}
            </div>
          )}
          {popup.brainError && (
            <div className="mt-2 text-[9px] text-red-400">Erreur connexion CVL BRAIN</div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center"><AlertCircle size={32} className="mx-auto mb-2 text-red-500" /><p className="text-sm text-[#F4F1EA]">{error}</p></div>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-[#A65D47] mx-auto mb-2" />
            <p className="text-xs text-[#888]">Construction du graphe culturel...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MgraphView;
