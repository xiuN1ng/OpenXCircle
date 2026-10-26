import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Play, Pause, Compass, Info } from 'lucide-react';
import type { CircleData, UserNode } from '../types';

interface Galaxy3DViewProps {
  data: CircleData;
  onSelectUser: (user: UserNode) => void;
}

export const Galaxy3DView: React.FC<Galaxy3DViewProps> = ({ data, onSelectUser }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hoveredUser, setHoveredUser] = useState<UserNode | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const planetsGroupRef = useRef<THREE.Group | null>(null);
  const billboardMeshesRef = useRef<THREE.Mesh[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Interaction refs
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const rotationMomentumRef = useRef({ x: 0.0015, y: 0 });
  const clickableMeshesRef = useRef<Map<THREE.Object3D, UserNode>>(new Map());

  // High-definition billboard avatar texture generator
  const createBillboardTexture = (
    avatarUrl: string,
    name: string,
    rank: 'S' | 'A' | 'B' | 'C' | 'SUN'
  ): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const borderColor =
      rank === 'SUN'
        ? '#818cf8'
        : rank === 'S'
        ? '#f59e0b'
        : rank === 'A'
        ? '#c084fc'
        : '#38bdf8';

    // 1. Outer Glow Ring
    const grad = ctx.createRadialGradient(128, 128, 90, 128, 128, 124);
    grad.addColorStop(0, borderColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fill();

    // 2. Base Disc
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(128, 128, 105, 0, Math.PI * 2);
    ctx.fill();

    // 3. Fallback Initial Letter
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((name || '?').replace('@', '').charAt(0).toUpperCase(), 128, 128);

    // 4. Solid Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 105, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Asynchronously load real avatar image
    if (avatarUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.src = avatarUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, 256, 256);

        // Outer glow
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(128, 128, 124, 0, Math.PI * 2);
        ctx.fill();

        // Clip & draw image
        ctx.save();
        ctx.beginPath();
        ctx.arc(128, 128, 105, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 23, 23, 210, 210);
        ctx.restore();

        // Border ring
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(128, 128, 105, 0, Math.PI * 2);
        ctx.stroke();

        texture.needsUpdate = true;
      };
    }

    return texture;
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 650;

    // 1. Scene & Cinematic Camera (Tilted 45°俯视视角 for perfect 3D depth)
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x020617, 0.0009);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
    // Tilted camera position looking down at the solar system:
    camera.position.set(0, 240, 270);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020617, 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0xa855f7, 4, 600);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // 4. Cosmic Starfield Particles (3,000 depth stars)
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 250 + Math.random() * 900;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const colorMix = Math.random();
      if (colorMix > 0.7) {
        starColors[i * 3] = 0.4; starColors[i * 3 + 1] = 0.6; starColors[i * 3 + 2] = 1.0;
      } else if (colorMix > 0.4) {
        starColors[i * 3] = 0.9; starColors[i * 3 + 1] = 0.5; starColors[i * 3 + 2] = 0.9;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0;
      }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 5. Planetary System Group
    const systemGroup = new THREE.Group();
    scene.add(systemGroup);
    planetsGroupRef.current = systemGroup;

    clickableMeshesRef.current.clear();
    billboardMeshesRef.current = [];

    // 6. Central Sun (Target User Billboard - ALWAYS FACES CAMERA)
    const centerRadius = 26;
    const centerTex = createBillboardTexture(data.targetUser.avatar, data.targetUser.handle, 'SUN');
    const centerGeo = new THREE.CircleGeometry(centerRadius, 32);
    const centerMat = new THREE.MeshBasicMaterial({
      map: centerTex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.position.set(0, 0, 0);
    systemGroup.add(centerMesh);
    billboardMeshesRef.current.push(centerMesh);

    // Central Corona Aura (Horizontal glow ring)
    const coronaGeo = new THREE.RingGeometry(centerRadius * 1.05, centerRadius * 1.5, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    coronaMesh.rotation.x = Math.PI / 2;
    systemGroup.add(coronaMesh);

    // 7. Orbits & Planetary Billboards
    // Spaced out for high readability
    const orbitRadii = [75, 135, 195];
    const rings = [data.innerRing, data.middleRing, data.outerRing];
    const ringColors = [0x6366f1, 0xa855f7, 0x06b6d4];

    orbitRadii.forEach((radius, ringIdx) => {
      // 3D Orbital Track Ring
      const orbitCurve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const points = orbitCurve.getPoints(120);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, 0, p.y))
      );
      const orbitMat = new THREE.LineBasicMaterial({
        color: ringColors[ringIdx],
        transparent: true,
        opacity: 0.35,
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      systemGroup.add(orbitLine);

      // Planet Nodes
      const usersOnRing = rings[ringIdx] || [];
      const userCount = usersOnRing.length;
      if (userCount === 0) return;

      const angleStep = (Math.PI * 2) / userCount;
      const nodeRadius = ringIdx === 0 ? 12 : ringIdx === 1 ? 9.5 : 7.5;

      usersOnRing.forEach((user, idx) => {
        const angle = idx * angleStep;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Planet Billboard (ALWAYS FACES CAMERA)
        const planetGeo = new THREE.CircleGeometry(nodeRadius, 32);
        const planetTex = createBillboardTexture(user.avatar, user.handle, user.rank);
        const planetMat = new THREE.MeshBasicMaterial({
          map: planetTex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const planetMesh = new THREE.Mesh(planetGeo, planetMat);
        planetMesh.position.set(x, 0, z);

        // Save reference for raycaster and billboard camera-tracking
        clickableMeshesRef.current.set(planetMesh, user);
        billboardMeshesRef.current.push(planetMesh);
        systemGroup.add(planetMesh);

        // Planetary Orbital Glow Ring (lying on the orbit plane for 3D planetary look)
        const haloGeo = new THREE.RingGeometry(nodeRadius * 1.05, nodeRadius * 1.45, 24);
        const haloMat = new THREE.MeshBasicMaterial({
          color: user.rank === 'S' ? 0xf59e0b : user.rank === 'A' ? 0xc084fc : 0x38bdf8,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.position.set(x, 0, z);
        haloMesh.rotation.x = Math.PI / 2;
        systemGroup.add(haloMesh);
      });
    });

    // 8. 60 FPS Animation Loop (Crucial: orient all avatars directly towards camera)
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      // 1. Keep all avatar billboards facing the camera directly at all times!
      const cameraQuat = camera.quaternion;
      for (let i = 0; i < billboardMeshesRef.current.length; i++) {
        billboardMeshesRef.current[i].quaternion.copy(cameraQuat);
      }

      // 2. Starfield slow rotation
      starField.rotation.y += 0.0002;

      // 3. System smooth rotation
      if (isPlaying) {
        systemGroup.rotation.y += 0.0018;
      }

      // 4. Momentum damping when not dragging
      if (!isDraggingRef.current) {
        systemGroup.rotation.y += rotationMomentumRef.current.x;
        systemGroup.rotation.x += rotationMomentumRef.current.y;
        rotationMomentumRef.current.x *= 0.94;
        rotationMomentumRef.current.y *= 0.94;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handler
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [data, isPlaying]);

  // Raycasting helper for hover and click
  const getIntersectedUser = useCallback((clientX: number, clientY: number): UserNode | null => {
    const mount = mountRef.current;
    const camera = cameraRef.current;
    if (!mount || !camera) return null;

    const rect = mount.getBoundingClientRect();
    const x = ((clientX - rect.left) / mount.clientWidth) * 2 - 1;
    const y = -((clientY - rect.top) / mount.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const meshes = Array.from(clickableMeshesRef.current.keys());
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      return clickableMeshesRef.current.get(intersects[0].object) || null;
    }
    return null;
  }, []);

  // Mouse Drag & Click Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mount = mountRef.current;
    if (mount) {
      const rect = mount.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (isDraggingRef.current && planetsGroupRef.current) {
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      planetsGroupRef.current.rotation.y += deltaX * 0.005;
      planetsGroupRef.current.rotation.x += deltaY * 0.005;

      rotationMomentumRef.current = { x: deltaX * 0.002, y: deltaY * 0.002 };
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    } else {
      const user = getIntersectedUser(e.clientX, e.clientY);
      setHoveredUser(user);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const deltaX = Math.abs(e.clientX - previousMousePositionRef.current.x);
    const deltaY = Math.abs(e.clientY - previousMousePositionRef.current.y);

    // If it was a click (not a drag)
    if (deltaX < 5 && deltaY < 5) {
      const user = getIntersectedUser(e.clientX, e.clientY);
      if (user) {
        onSelectUser(user);
      }
    }

    isDraggingRef.current = false;
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const camera = cameraRef.current;
    if (!camera) return;

    camera.position.z = Math.min(500, Math.max(120, camera.position.z + e.deltaY * 0.25));
    camera.position.y = Math.min(420, Math.max(80, camera.position.y + e.deltaY * 0.22));
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto p-2 sm:p-4 animate-fade-in">
      <div className="relative w-full h-[580px] sm:h-[660px] rounded-3xl overflow-hidden shadow-2xl shadow-indigo-950/60 border border-slate-800/80 bg-slate-950 select-none">
        {/* Three.js Canvas Container */}
        <div
          ref={mountRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Floating Controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? '暂停自转' : '开启公转'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-indigo-400" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              if (cameraRef.current && planetsGroupRef.current) {
                // Reset to optimal 45° overhead tilted view
                cameraRef.current.position.set(0, 240, 270);
                cameraRef.current.lookAt(0, 0, 0);
                planetsGroupRef.current.rotation.set(0, 0, 0);
              }
            }}
            title="复位 45° 俯瞰视角"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>

        {/* Top Info Banner */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            3D 真实宇宙星系漫游
          </span>
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800 backdrop-blur-md">
            <Info className="w-3 h-3 text-indigo-400" />
            已开启「头像锁定面朝视角」· 鼠标拖拽 360° · 点击任意星球查看详情
          </span>
        </div>

        {/* Hover Tooltip Card */}
        {hoveredUser && (
          <div
            style={{
              left: Math.min(window.innerWidth - 220, mousePos.x + 15),
              top: Math.max(10, mousePos.y - 70),
            }}
            className="absolute z-20 pointer-events-none p-3 rounded-2xl bg-slate-900/95 border border-indigo-500/50 shadow-2xl backdrop-blur-md flex items-center gap-3 transition-opacity duration-150 animate-fade-in"
          >
            <img
              src={hoveredUser.avatar}
              alt={hoveredUser.handle}
              className="w-10 h-10 rounded-full border border-indigo-400 object-cover"
            />
            <div>
              <p className="text-xs font-bold text-white leading-tight">{hoveredUser.name}</p>
              <p className="text-[11px] text-indigo-400">@{hoveredUser.handle}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                  {hoveredUser.rank} 级星球
                </span>
                <span>{hoveredUser.score} pts · 点击查看</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
