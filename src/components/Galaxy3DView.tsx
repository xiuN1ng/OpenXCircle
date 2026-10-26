import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Play, Pause, RotateCcw, Sparkles, Compass } from 'lucide-react';
import type { CircleData, UserNode } from '../types';

interface Galaxy3DViewProps {
  data: CircleData;
  onSelectUser: (user: UserNode) => void;
}

interface PlanetNodeRef {
  group: THREE.Group;
  sprite: THREE.Sprite;
  user: UserNode;
  baseScale: number;
}

export const Galaxy3DView: React.FC<Galaxy3DViewProps> = ({ data, onSelectUser }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.8); // Default to calm, majestic pace
  const [hoveredUser, setHoveredUser] = useState<UserNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const innerOrbitGroupRef = useRef<THREE.Group | null>(null);
  const middleOrbitGroupRef = useRef<THREE.Group | null>(null);
  const outerOrbitGroupRef = useRef<THREE.Group | null>(null);

  const planetNodesRef = useRef<PlanetNodeRef[]>([]);
  const clickableSpritesRef = useRef<Map<THREE.Sprite, UserNode>>(new Map());
  const hoveredSpriteRef = useRef<THREE.Sprite | null>(null);

  // High-definition 512x512 billboard canvas texture generator
  // 100% unobstructed, ultra-crisp avatar display
  const createPlanetSpriteTexture = (
    avatarUrl: string,
    name: string,
    handle: string,
    rank: 'SUN' | 'S' | 'A' | 'B' | 'C'
  ): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const borderColor =
      rank === 'SUN'
        ? '#fbbf24'
        : rank === 'S'
        ? '#f59e0b'
        : rank === 'A'
        ? '#c084fc'
        : '#38bdf8';

    const glowColor =
      rank === 'SUN'
        ? 'rgba(251, 191, 36, 0.7)'
        : rank === 'S'
        ? 'rgba(245, 158, 11, 0.65)'
        : rank === 'A'
        ? 'rgba(192, 132, 252, 0.55)'
        : 'rgba(56, 189, 248, 0.5)';

    const drawContent = (loadedImg: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, 512, 512);

      const cx = 256;
      const cy = 224; // elevated center to leave space for handle pill below
      const r = 168;

      // 1. Soft Cosmic Atmosphere Glow
      const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.38);
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(0.7, glowColor.replace(/[\d\.]+\)$/, '0.2)'));
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.38, 0, Math.PI * 2);
      ctx.fill();

      // 2. Base Dark Cosmic Disc Backing
      ctx.fillStyle = '#060a14';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // 3. Avatar Photo or Stylized Initial Fallback
      if (loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(loadedImg, cx - (r - 6), cy - (r - 6), (r - 6) * 2, (r - 6) * 2);
        ctx.restore();
      } else {
        // High-tech cyber gradient fallback
        const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        grad.addColorStop(0, borderColor);
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
        ctx.fill();

        // Initial letter
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 144px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initial = (name || handle || '?').replace('@', '').charAt(0).toUpperCase();
        ctx.fillText(initial, cx, cy);
      }

      // 4. Luminous Border Ring
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = rank === 'SUN' ? 14 : 9;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
      ctx.stroke();

      // 5. Specular Arc Highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 5, -Math.PI * 0.78, -Math.PI * 0.15);
      ctx.stroke();

      // 6. Handle Pill at Bottom (Dark semi-transparent capsule)
      const cleanHandle = handle.length > 12 ? handle.substring(0, 11) + '…' : handle;
      ctx.font = '600 30px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(`@${cleanHandle}`).width;
      const pillHeight = 52;
      const pillWidth = Math.min(420, Math.max(160, textWidth + 56));
      const pillX = cx - pillWidth / 2;
      const pillY = 422;

      ctx.fillStyle = 'rgba(6, 10, 20, 0.92)';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 26);
      ctx.fill();
      ctx.stroke();

      // Pill Text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`@${cleanHandle}`, cx, pillY + pillHeight / 2 + 1);

      // 7. Rank Badge Emblem (Top right)
      const badgeR = 34;
      const badgeX = cx + r * 0.72;
      const badgeY = cy - r * 0.72;

      ctx.fillStyle = borderColor;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#060a14';
      ctx.font = '900 30px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rank === 'SUN' ? '☀️' : rank, badgeX, badgeY + 2);
    };

    drawContent(null);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    if (avatarUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.src = avatarUrl;
      img.onload = () => {
        drawContent(img);
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

    // 1. Scene & Space Depth Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x02040d, 0.0006);

    // 2. Camera: Isometric Cinematic View
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
    camera.position.set(0, 180, 250);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x02040d, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Smooth Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 90;
    controls.maxDistance = 600;
    controls.maxPolarAngle = Math.PI / 2 + 0.35;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xfbbf24, 4, 900);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // 6. Deep Space: 3,500 Twinkling Multi-color Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 3500;
    const starPos = new Float32Array(starCount * 3);
    const starCols = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 300 + Math.random() * 1100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);

      const colorDice = Math.random();
      if (colorDice > 0.75) {
        starCols[i * 3] = 0.4; starCols[i * 3 + 1] = 0.75; starCols[i * 3 + 2] = 1.0;
      } else if (colorDice > 0.5) {
        starCols[i * 3] = 0.85; starCols[i * 3 + 1] = 0.55; starCols[i * 3 + 2] = 1.0;
      } else if (colorDice > 0.3) {
        starCols[i * 3] = 1.0; starCols[i * 3 + 1] = 0.85; starCols[i * 3 + 2] = 0.4;
      } else {
        starCols[i * 3] = 1.0; starCols[i * 3 + 1] = 1.0; starCols[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 7. Volumetric Nebula Particles along Galactic Plane
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaCount = 500;
    const nebPos = new Float32Array(nebulaCount * 3);
    const nebCols = new Float32Array(nebulaCount * 3);

    for (let i = 0; i < nebulaCount; i++) {
      const dist = 70 + Math.random() * 320;
      const ang = Math.random() * Math.PI * 2;
      const yOffset = (Math.random() - 0.5) * 35;

      nebPos[i * 3] = Math.cos(ang) * dist;
      nebPos[i * 3 + 1] = yOffset;
      nebPos[i * 3 + 2] = Math.sin(ang) * dist;

      nebCols[i * 3] = 0.45;
      nebCols[i * 3 + 1] = 0.3;
      nebCols[i * 3 + 2] = 0.95;
    }

    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
    nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebCols, 3));
    const nebulaMat = new THREE.PointsMaterial({
      size: 4.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
    });
    const nebulaField = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebulaField);

    // Clean tracking refs
    planetNodesRef.current = [];
    clickableSpritesRef.current.clear();

    // 8. Central Sun (Target User Core Star - 100% UNOBSTRUCTED!)
    const sunGroup = new THREE.Group();
    scene.add(sunGroup);

    // Dynamic Solar Corona Rings (outer radius larger than avatar, circling AROUND avatar without covering it!)
    const coronaGeo1 = new THREE.RingGeometry(24, 34, 48);
    const coronaMat1 = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const corona1 = new THREE.Mesh(coronaGeo1, coronaMat1);
    corona1.rotation.x = Math.PI / 2;
    sunGroup.add(corona1);

    const coronaGeo2 = new THREE.RingGeometry(30, 42, 48);
    const coronaMat2 = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const corona2 = new THREE.Mesh(coronaGeo2, coronaMat2);
    corona2.rotation.x = Math.PI / 2 + 0.18;
    sunGroup.add(corona2);

    // Target User Avatar Billboard Sprite (Always faces camera, renderOrder = 100)
    const targetUserNode: UserNode = {
      id: 'sun-center',
      name: data.targetUser.name,
      handle: data.targetUser.handle,
      avatar: data.targetUser.avatar,
      score: 100,
      rank: 'S',
      ring: 1,
      relationship: 'mutual',
      interactions: {
        replies: data.stats.totalInteractions,
        quotes: 0,
        retweets: 0,
        mentions: 0,
        total: data.stats.totalInteractions,
      },
      badges: ['主恒星核心', '引力中心'],
    };

    const sunTex = createPlanetSpriteTexture(
      data.targetUser.avatar,
      data.targetUser.name,
      data.targetUser.handle,
      'SUN'
    );
    const sunSpriteMat = new THREE.SpriteMaterial({
      map: sunTex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sunSprite = new THREE.Sprite(sunSpriteMat);
    const sunScale = 40;
    sunSprite.scale.set(sunScale, sunScale, 1);
    sunSprite.position.set(0, 0, 0);
    sunSprite.renderOrder = 100; // ensure never obscured
    sunGroup.add(sunSprite);

    clickableSpritesRef.current.set(sunSprite, targetUserNode);
    planetNodesRef.current.push({
      group: sunGroup,
      sprite: sunSprite,
      user: targetUserNode,
      baseScale: sunScale,
    });

    // 9. Planetary Orbital Rings & Systems
    const orbitRadii = [82, 148, 218];
    const ringUsers = [data.innerRing, data.middleRing, data.outerRing];
    const ringColors = [0xf59e0b, 0xa855f7, 0x06b6d4];

    // Groups for independent orbital speeds (Kepler's Law)
    const innerGroup = new THREE.Group();
    const middleGroup = new THREE.Group();
    const outerGroup = new THREE.Group();

    scene.add(innerGroup);
    scene.add(middleGroup);
    scene.add(outerGroup);

    innerOrbitGroupRef.current = innerGroup;
    middleOrbitGroupRef.current = middleGroup;
    outerOrbitGroupRef.current = outerGroup;

    const orbitGroups = [innerGroup, middleGroup, outerGroup];

    orbitRadii.forEach((radius, ringIdx) => {
      const parentGroup = orbitGroups[ringIdx];

      // 3D Orbital Track Ring (Luminous circle on horizontal plane)
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const points = curve.getPoints(120);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, 0, p.y))
      );
      const orbitMat = new THREE.LineBasicMaterial({
        color: ringColors[ringIdx],
        transparent: true,
        opacity: 0.38,
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      scene.add(orbitLine);

      // Users on this orbit
      const users = ringUsers[ringIdx] || [];
      const count = users.length;
      if (count === 0) return;

      const angleStep = (Math.PI * 2) / count;
      const spriteScale = ringIdx === 0 ? 25 : ringIdx === 1 ? 20 : 16;

      users.forEach((user, idx) => {
        const angle = idx * angleStep;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Individual Planet Container at (x, 0, z)
        const planetSystem = new THREE.Group();
        planetSystem.position.set(x, 0, z);
        parentGroup.add(planetSystem);

        // 1. Orbital Beacon Ring on Orbit Plane (y = 0)
        // Marks celestial orbit location without touching avatar
        const beaconGeo = new THREE.RingGeometry(2.5, 4.2, 24);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: ringColors[ringIdx],
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        });
        const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        beaconMesh.rotation.x = Math.PI / 2;
        planetSystem.add(beaconMesh);

        // 2. Vertical Sci-Fi Light Beam connecting orbit line to floating planet
        const beamGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 5, 0),
        ]);
        const beamMat = new THREE.LineBasicMaterial({
          color: ringColors[ringIdx],
          transparent: true,
          opacity: 0.35,
        });
        const beamLine = new THREE.Line(beamGeo, beamMat);
        planetSystem.add(beamLine);

        // 3. Avatar Billboard Sprite (Elevated at y = 5, 100% UNOBSTRUCTED!)
        const texture = createPlanetSpriteTexture(user.avatar, user.name, user.handle, user.rank);
        const spriteMat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: true,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(spriteScale, spriteScale, 1);
        sprite.position.set(0, 5, 0); // floats cleanly above orbit plane
        sprite.renderOrder = 100; // strictly on top, never clipped!
        planetSystem.add(sprite);

        // Save reference for raycasting and hover animation
        clickableSpritesRef.current.set(sprite, user);
        planetNodesRef.current.push({
          group: planetSystem,
          sprite,
          user,
          baseScale: spriteScale,
        });
      });
    });

    // 10. Animation Loop with Gentle Keplerian Revolution & Smart Hover Slowdown
    // BASE_SPEED is calibrated to be graceful, calm, and majestic (previously 0.0028, now 0.0006)
    const BASE_SPEED = 0.0006;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      controls.update();

      // Slow celestial drift
      starField.rotation.y += 0.0001;
      nebulaField.rotation.y -= 0.00015;

      // Sun corona spin
      corona1.rotation.z += 0.0025;
      corona2.rotation.z -= 0.0018;

      // Smart Speed: When user hovers a planet, auto-slow down to 0.05x for effortless inspection & clicking!
      const isHovering = hoveredSpriteRef.current !== null;
      const currentSpeed = isHovering
        ? BASE_SPEED * 0.05
        : isPlaying
        ? BASE_SPEED * speedMultiplier
        : 0;

      if (currentSpeed > 0) {
        if (innerGroup) innerGroup.rotation.y += currentSpeed * 1.0;
        if (middleGroup) middleGroup.rotation.y += currentSpeed * 0.65;
        if (outerGroup) outerGroup.rotation.y += currentSpeed * 0.42;
      }

      // Smooth Hover Scale Spring Animation
      planetNodesRef.current.forEach((node) => {
        const isTarget = hoveredSpriteRef.current === node.sprite;
        const targetScale = isTarget ? node.baseScale * 1.25 : node.baseScale;
        node.sprite.scale.lerp(new THREE.Vector3(targetScale, targetScale, 1), 0.18);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 11. Window Resize
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
      controls.dispose();
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [data, isPlaying, speedMultiplier]);

  // Raycaster to detect planet sprite under cursor
  const getIntersectedSprite = useCallback((clientX: number, clientY: number): THREE.Sprite | null => {
    const mount = mountRef.current;
    const camera = cameraRef.current;
    if (!mount || !camera) return null;

    const rect = mount.getBoundingClientRect();
    const x = ((clientX - rect.left) / mount.clientWidth) * 2 - 1;
    const y = -((clientY - rect.top) / mount.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const sprites = Array.from(clickableSpritesRef.current.keys());
    const intersects = raycaster.intersectObjects(sprites, false);

    if (intersects.length > 0) {
      return intersects[0].object as THREE.Sprite;
    }
    return null;
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const mount = mountRef.current;
    if (!mount) return;

    const rect = mount.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    const sprite = getIntersectedSprite(e.clientX, e.clientY);
    hoveredSpriteRef.current = sprite;

    if (sprite) {
      const user = clickableSpritesRef.current.get(sprite) || null;
      setHoveredUser(user);
    } else {
      setHoveredUser(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const sprite = getIntersectedSprite(e.clientX, e.clientY);
    if (sprite) {
      const user = clickableSpritesRef.current.get(sprite);
      if (user) {
        onSelectUser(user);
      }
    }
  };

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 180, 250);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto p-2 sm:p-4 animate-fade-in select-none">
      <div className="relative w-full h-[580px] sm:h-[680px] rounded-3xl overflow-hidden shadow-2xl shadow-indigo-950/70 border border-slate-800/80 bg-slate-950 group">
        {/* Three.js Canvas */}
        <div
          ref={mountRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Top Info Pill */}
        <div className="absolute top-4 left-4 flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-800 shadow-xl pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">
            3D 实时宇宙星系 · 共 <span className="text-white font-bold">{data.innerRing.length + data.middleRing.length + data.outerRing.length}</span> 颗社交星球
          </span>
          {hoveredUser && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
              悬停减速中
            </span>
          )}
        </div>

        {/* Floating Holographic Tooltip on Planet Hover */}
        {hoveredUser && (
          <div
            className="absolute z-30 pointer-events-none transition-transform duration-75 ease-out"
            style={{
              left: `${tooltipPos.x + 18}px`,
              top: `${tooltipPos.y - 24}px`,
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-3 shadow-2xl shadow-indigo-950/80 max-w-[260px] animate-fade-in">
              <div className="flex items-center gap-3">
                <img
                  src={hoveredUser.avatar}
                  alt={hoveredUser.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400/60 bg-slate-800 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white truncate">{hoveredUser.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                        hoveredUser.rank === 'S'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : hoveredUser.rank === 'A'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {hoveredUser.rank} 阶
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">@{hoveredUser.handle}</p>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                <span className="text-indigo-300 font-medium">
                  {hoveredUser.badges[0] || '互动星球'}
                </span>
                <span className="text-slate-400">
                  互动 <span className="text-white font-bold">{hoveredUser.interactions.total}</span> 次
                </span>
              </div>

              <div className="mt-1.5 text-[10px] text-indigo-400/90 text-center font-medium flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                点击探索星象档案
              </div>
            </div>
          </div>
        )}

        {/* Orbit Legend (Bottom Left) */}
        <div className="absolute bottom-4 left-4 hidden sm:flex items-center gap-3 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 shadow-xl pointer-events-none text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            <span className="text-slate-300">核心星系 (S)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
            <span className="text-slate-300">中层轨道 (A)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            <span className="text-slate-300">外层星云 (B)</span>
          </div>
        </div>

        {/* Speed & Interactive Controls Bar (Bottom Right) */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-800 shadow-xl">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? '暂停公转' : '开启公转'}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-indigo-400" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Speed Presets */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/60">
            {[
              { label: '0.3x', val: 0.3, tip: '慢速惬意' },
              { label: '0.8x', val: 0.8, tip: '标准优雅' },
              { label: '1.5x', val: 1.5, tip: '极速穿梭' },
            ].map((spd) => (
              <button
                key={spd.val}
                onClick={() => {
                  setSpeedMultiplier(spd.val);
                  setIsPlaying(true);
                }}
                title={spd.tip}
                className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  speedMultiplier === spd.val && isPlaying
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>

          {/* Reset Camera View */}
          <button
            onClick={handleResetCamera}
            title="复位视角"
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Operation Hint */}
        <div className="absolute top-4 right-4 hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/70 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-slate-800/60 pointer-events-none">
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          左键旋转 · 滚轮缩放 · 悬停自动减速 · 点击看详情
        </div>
      </div>
    </div>
  );
};
