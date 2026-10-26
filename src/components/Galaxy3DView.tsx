import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Compass,
  ExternalLink,
  X,
  Target,
  Maximize2,
  Minimize2,
  MessageCircle,
  Repeat,
  Quote,
  Zap,
  Award,
} from 'lucide-react';
import type { CircleData, UserNode } from '../types';
import { EncounterModal } from './EncounterModal';

interface Galaxy3DViewProps {
  data: CircleData;
  onSelectUser: (user: UserNode) => void;
}

interface PlanetNodeRef {
  group: THREE.Group;
  sprite: THREE.Sprite;
  beaconSprite: THREE.Sprite;
  user: UserNode;
  baseScale: number;
}

export const Galaxy3DView: React.FC<Galaxy3DViewProps> = ({ data, onSelectUser }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.8);
  const [hoveredUser, setHoveredUser] = useState<UserNode | null>(null);
  const [selectedPlanetUser, setSelectedPlanetUser] = useState<UserNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEncounterModalOpen, setIsEncounterModalOpen] = useState(false);

  // Sync selected planet to ref for 60fps Three.js animation loop
  const selectedPlanetUserRef = useRef<UserNode | null>(null);
  useEffect(() => {
    selectedPlanetUserRef.current = selectedPlanetUser;
  }, [selectedPlanetUser]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cinematic Camera Flight & Tracking State
  const flightStateRef = useRef<{
    isFlying: boolean;
    isTracking: boolean;
    startTime: number;
    duration: number;
    startCamPos: THREE.Vector3;
    startTargetPos: THREE.Vector3;
    targetNode: PlanetNodeRef | null;
  }>({
    isFlying: false,
    isTracking: false,
    startTime: 0,
    duration: 1100,
    startCamPos: new THREE.Vector3(0, 180, 250),
    startTargetPos: new THREE.Vector3(0, 0, 0),
    targetNode: null,
  });

  // Groups & Objects
  const innerOrbitGroupRef = useRef<THREE.Group | null>(null);
  const middleOrbitGroupRef = useRef<THREE.Group | null>(null);
  const outerOrbitGroupRef = useRef<THREE.Group | null>(null);

  const planetNodesRef = useRef<PlanetNodeRef[]>([]);
  const clickableSpritesRef = useRef<Map<THREE.Sprite, UserNode>>(new Map());
  const hoveredSpriteRef = useRef<THREE.Sprite | null>(null);

  // 1. Procedural Star Texture Generator for Real Optical Blooming Stars
  const createStarTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.12, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.35, 'rgba(186, 230, 253, 0.55)');
    grad.addColorStop(0.65, 'rgba(99, 102, 241, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    // Subtle 4-point optical diffraction starburst flare
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(32, 6); ctx.lineTo(32, 58);
    ctx.moveTo(6, 32); ctx.lineTo(58, 32);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 2. Procedural Volumetric Nebula Cloud Texture
  const createNebulaTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.25, 'rgba(192, 132, 252, 0.45)');
    grad.addColorStop(0.55, 'rgba(79, 70, 229, 0.18)');
    grad.addColorStop(0.85, 'rgba(6, 182, 212, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 3. Photorealistic Stellar Optical Bloom Texture (NO cartoon rays, NO spokes)
  const createStellarBloomTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const cx = 128;
    const cy = 128;

    // Smooth photographic Gaussian celestial bloom
    const grad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 120);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.2, 'rgba(254, 240, 138, 0.65)');
    grad.addColorStop(0.48, 'rgba(245, 158, 11, 0.22)');
    grad.addColorStop(0.75, 'rgba(99, 102, 241, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 3b. Cinematic Anamorphic Optical Flare Streak (James Webb / Interstellar style)
  const createAnamorphicStreakTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const cy = 32;

    const gradH = ctx.createLinearGradient(0, cy, 512, cy);
    gradH.addColorStop(0, 'rgba(186, 230, 253, 0)');
    gradH.addColorStop(0.35, 'rgba(186, 230, 253, 0.25)');
    gradH.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
    gradH.addColorStop(0.65, 'rgba(186, 230, 253, 0.25)');
    gradH.addColorStop(1, 'rgba(186, 230, 253, 0)');

    ctx.fillStyle = gradH;
    for (let y = 0; y < 14; y++) {
      const alpha = Math.cos((y / 14) * (Math.PI / 2));
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillRect(0, cy - y, 512, 1);
      ctx.fillRect(0, cy + y, 512, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 4. Soft Optical Beacon Flare Texture for Planet Base
  const createBeaconTexture = (color: string): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.25, color);
    grad.addColorStop(0.65, color.replace(/[\d\.]+\)$/, '0.15)'));
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 5. High-definition 512x512 billboard canvas texture generator
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
        ? 'rgba(251, 191, 36, 0.75)'
        : rank === 'S'
        ? 'rgba(245, 158, 11, 0.65)'
        : rank === 'A'
        ? 'rgba(192, 132, 252, 0.55)'
        : 'rgba(56, 189, 248, 0.5)';

    const drawContent = (loadedImg: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, 512, 512);

      const cx = 256;
      const cy = 224;
      const r = 168;

      // Soft Cosmic Atmosphere Glow
      const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.38);
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(0.7, glowColor.replace(/[\d\.]+\)$/, '0.2)'));
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.38, 0, Math.PI * 2);
      ctx.fill();

      // Base Dark Cosmic Disc Backing
      ctx.fillStyle = '#060a14';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Avatar Photo or Stylized Initial Fallback
      if (loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(loadedImg, cx - (r - 6), cy - (r - 6), (r - 6) * 2, (r - 6) * 2);
        ctx.restore();
      } else {
        const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        grad.addColorStop(0, borderColor);
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 144px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initial = (name || handle || '?').replace('@', '').charAt(0).toUpperCase();
        ctx.fillText(initial, cx, cy);
      }

      // Luminous Border Ring
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = rank === 'SUN' ? 14 : 9;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
      ctx.stroke();

      // Specular Arc Highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 5, -Math.PI * 0.78, -Math.PI * 0.15);
      ctx.stroke();

      // Handle Pill at Bottom
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

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`@${cleanHandle}`, cx, pillY + pillHeight / 2 + 1);

      // Rank Badge Emblem (Top right)
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
    const height = mount.clientHeight || 700;

    // 1. Scene & Deep Space Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x020308, 0.0005);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 4000);
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
    renderer.setClearColor(0x020308, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Smooth Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 15;
    controls.maxDistance = 850;
    controls.maxPolarAngle = Math.PI / 2 + 0.35;
    controlsRef.current = controls;

    // Relinquish automated camera flight when user manually drags with mouse
    controls.addEventListener('start', () => {
      flightStateRef.current.isFlying = false;
      flightStateRef.current.isTracking = false;
    });

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xfbbf24, 4.5, 1000);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const blueSpaceLight = new THREE.PointLight(0x38bdf8, 2, 800);
    blueSpaceLight.position.set(0, 150, 0);
    scene.add(blueSpaceLight);

    // 6. Deep Cosmos: 4,000 Optical Blooming Star Particles
    const starTexture = createStarTexture();
    const starGeo = new THREE.BufferGeometry();
    const starCount = 4000;
    const starPos = new Float32Array(starCount * 3);
    const starCols = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 260 + Math.random() * 1300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);

      const dice = Math.random();
      if (dice > 0.75) {
        starCols[i * 3] = 0.55; starCols[i * 3 + 1] = 0.85; starCols[i * 3 + 2] = 1.0;
      } else if (dice > 0.5) {
        starCols[i * 3] = 0.9; starCols[i * 3 + 1] = 0.6; starCols[i * 3 + 2] = 1.0;
      } else if (dice > 0.3) {
        starCols[i * 3] = 1.0; starCols[i * 3 + 1] = 0.88; starCols[i * 3 + 2] = 0.45;
      } else {
        starCols[i * 3] = 1.0; starCols[i * 3 + 1] = 1.0; starCols[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));

    const starMat = new THREE.PointsMaterial({
      size: 4.2,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 7. Volumetric Milky Way Nebula Dust Lane (Inclined 22°)
    const nebulaTexture = createNebulaTexture();
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaCount = 650;
    const nebPos = new Float32Array(nebulaCount * 3);
    const nebCols = new Float32Array(nebulaCount * 3);

    for (let i = 0; i < nebulaCount; i++) {
      const dist = 60 + Math.random() * 380;
      const ang = Math.random() * Math.PI * 2;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      const y = x * 0.22 + (Math.random() - 0.5) * 45;

      nebPos[i * 3] = x;
      nebPos[i * 3 + 1] = y;
      nebPos[i * 3 + 2] = z;

      const cMix = Math.random();
      if (cMix > 0.5) {
        nebCols[i * 3] = 0.45; nebCols[i * 3 + 1] = 0.25; nebCols[i * 3 + 2] = 0.95;
      } else {
        nebCols[i * 3] = 0.15; nebCols[i * 3 + 1] = 0.65; nebCols[i * 3 + 2] = 0.85;
      }
    }

    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
    nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebCols, 3));
    const nebulaMat = new THREE.PointsMaterial({
      size: 16.0,
      map: nebulaTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nebulaField = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebulaField);

    // 8. Cosmic Shooting Star System
    const shootingStarGeo = new THREE.BufferGeometry();
    const shootingStarPoints = new Float32Array(6);
    shootingStarGeo.setAttribute('position', new THREE.BufferAttribute(shootingStarPoints, 3));
    const shootingStarMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const shootingStarLine = new THREE.Line(shootingStarGeo, shootingStarMat);
    scene.add(shootingStarLine);

    let shootingStarActive = false;
    let shootingStarProgress = 0;
    const shootingStarStart = new THREE.Vector3();
    const shootingStarEnd = new THREE.Vector3();

    const triggerShootingStar = () => {
      shootingStarActive = true;
      shootingStarProgress = 0;
      const startX = (Math.random() - 0.5) * 600;
      const startY = 150 + Math.random() * 150;
      const startZ = (Math.random() - 0.5) * 600;
      shootingStarStart.set(startX, startY, startZ);
      shootingStarEnd.set(startX - 180, startY - 90, startZ - 140);
    };

    // Clean tracking refs
    planetNodesRef.current = [];
    clickableSpritesRef.current.clear();

    // 9. Central Sun: Cinematic Photorealistic Stellar Atmosphere
    const sunGroup = new THREE.Group();
    scene.add(sunGroup);

    // 9a. Soft Optical Gaussian Stellar Bloom (Hugs the sun avatar naturally, scale 58)
    const sunBloomTex = createStellarBloomTexture();
    const sunBloomMat = new THREE.SpriteMaterial({
      map: sunBloomTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunBloomSprite = new THREE.Sprite(sunBloomMat);
    const sunBloomBaseScale = 58;
    sunBloomSprite.scale.set(sunBloomBaseScale, sunBloomBaseScale, 1);
    sunBloomSprite.position.set(0, 0, 0);
    sunBloomSprite.renderOrder = 10;
    sunGroup.add(sunBloomSprite);

    // 9b. Cinematic Anamorphic Horizontal Optical Flare (NASA / Sci-Fi movie style)
    const sunStreakTex = createAnamorphicStreakTexture();
    const sunStreakMat = new THREE.SpriteMaterial({
      map: sunStreakTex,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunStreakSprite = new THREE.Sprite(sunStreakMat);
    sunStreakSprite.scale.set(160, 5, 1);
    sunStreakSprite.position.set(0, 0, 0);
    sunStreakSprite.renderOrder = 11;
    sunGroup.add(sunStreakSprite);

    // 9c. Central Avatar Billboard Sprite (Target User)
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
    sunSprite.renderOrder = 100;
    sunGroup.add(sunSprite);

    clickableSpritesRef.current.set(sunSprite, targetUserNode);
    planetNodesRef.current.push({
      group: sunGroup,
      sprite: sunSprite,
      beaconSprite: sunBloomSprite,
      user: targetUserNode,
      baseScale: sunScale,
    });

    // 10. Planetary Systems & Luminous Orbit Stardust Accretion Streams
    // Radii of concentric orbits
    const orbitRadii = [82, 148, 218];
    const ringUsers = [data.innerRing, data.middleRing, data.outerRing];

    // Refined celestial starlight color palette (NO harsh primary colors!)
    const stardustColors = [0xfef08a, 0xddd6fe, 0xbae6fd];
    const beaconRgba = [
      'rgba(254, 240, 138, 0.85)',
      'rgba(221, 214, 254, 0.75)',
      'rgba(186, 230, 253, 0.65)',
    ];

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

      // 10a. Ethereal Sub-surface Gravitational Track (Deep slate, ultra-low opacity 0.12 - NO harsh wires!)
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const points = curve.getPoints(120);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, 0, p.y))
      );
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x475569, // celestial slate
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      scene.add(orbitLine);

      // 10b. Living Accretion Stardust Stream (180 particles with natural radial dispersion)
      const particleCount = 180;
      const partGeo = new THREE.BufferGeometry();
      const partPos = new Float32Array(particleCount * 3);
      for (let p = 0; p < particleCount; p++) {
        const pAngle = (p / particleCount) * Math.PI * 2;
        // Subtle radial jitter creates a natural celestial dust ribbon
        const rJitter = radius + (Math.random() - 0.5) * 2.2;
        const yJitter = (Math.random() - 0.5) * 1.5;
        partPos[p * 3] = Math.cos(pAngle) * rJitter;
        partPos[p * 3 + 1] = yJitter;
        partPos[p * 3 + 2] = Math.sin(pAngle) * rJitter;
      }
      partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
      const partMat = new THREE.PointsMaterial({
        size: ringIdx === 0 ? 3.0 : ringIdx === 1 ? 2.6 : 2.2,
        map: starTexture,
        color: stardustColors[ringIdx],
        transparent: true,
        opacity: ringIdx === 0 ? 0.45 : ringIdx === 1 ? 0.38 : 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const orbitPoints = new THREE.Points(partGeo, partMat);
      parentGroup.add(orbitPoints);

      // 10c. Orbiting Planets
      const users = ringUsers[ringIdx] || [];
      const count = users.length;
      if (count === 0) return;

      const angleStep = (Math.PI * 2) / count;
      const spriteScale = ringIdx === 0 ? 25 : ringIdx === 1 ? 20 : 16;
      const beaconTex = createBeaconTexture(beaconRgba[ringIdx]);

      users.forEach((user, idx) => {
        const angle = idx * angleStep;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const planetSystem = new THREE.Group();
        planetSystem.position.set(x, 0, z);
        parentGroup.add(planetSystem);

        // Soft Optical Gravitational Beacon Flare on orbit plane (y = 0)
        // (REPLACED UGLY WASHER MESHES AND VERTICAL STICKS!)
        const beaconMat = new THREE.SpriteMaterial({
          map: beaconTex,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const beaconSprite = new THREE.Sprite(beaconMat);
        beaconSprite.scale.set(6, 6, 1);
        beaconSprite.position.set(0, 0, 0);
        planetSystem.add(beaconSprite);

        // Avatar Billboard Sprite (Elevated naturally at y = 3.5 in zero gravity)
        const texture = createPlanetSpriteTexture(user.avatar, user.name, user.handle, user.rank);
        const spriteMat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: true,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(spriteScale, spriteScale, 1);
        sprite.position.set(0, 3.5, 0);
        sprite.renderOrder = 100;
        planetSystem.add(sprite);

        clickableSpritesRef.current.set(sprite, user);
        planetNodesRef.current.push({
          group: planetSystem,
          sprite,
          beaconSprite,
          user,
          baseScale: spriteScale,
        });
      });
    });

    // 10d. Gravitational Resonance Tether & Flowing Photon Particles
    const TETHER_POINTS = 64;
    const tetherGeo = new THREE.BufferGeometry();
    const tetherPositions = new Float32Array(TETHER_POINTS * 3);
    tetherGeo.setAttribute('position', new THREE.BufferAttribute(tetherPositions, 3));

    const tetherMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tetherLine = new THREE.Line(tetherGeo, tetherMat);
    scene.add(tetherLine);

    // Luminous Photon Particle Stream along the Gravitational Tether
    const PHOTON_COUNT = 20;
    const photonGeo = new THREE.BufferGeometry();
    const photonPositions = new Float32Array(PHOTON_COUNT * 3);
    const photonColors = new Float32Array(PHOTON_COUNT * 3);
    photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPositions, 3));
    photonGeo.setAttribute('color', new THREE.BufferAttribute(photonColors, 3));

    const photonMat = new THREE.PointsMaterial({
      size: 5.5,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const photonPoints = new THREE.Points(photonGeo, photonMat);
    scene.add(photonPoints);

    // 11. 60 FPS Animation Loop
    const BASE_SPEED = 0.0006;
    let clock = 0;
    let nextShootingStarTime = 120;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      clock += 0.02;

      // Cinematic Camera Flight & Planet Tracking Controller
      const flight = flightStateRef.current;
      if (flight.isFlying) {
        const now = performance.now();
        const elapsed = now - flight.startTime;
        const progress = Math.min(1.0, elapsed / flight.duration);
        // Smooth cubic ease-in-out
        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        let endTarget = new THREE.Vector3(0, 0, 0);
        let endCam = new THREE.Vector3(0, 180, 250);

        if (flight.targetNode) {
          if (flight.targetNode.user.id === 'sun-center') {
            endTarget = new THREE.Vector3(0, 3.5, 0);
            endCam = new THREE.Vector3(0, 24, 75);
          } else {
            const pWorld = new THREE.Vector3();
            flight.targetNode.sprite.getWorldPosition(pWorld);
            endTarget = pWorld;

            // Frame planet: offset outward radially and slightly elevated
            const radialDir = new THREE.Vector3(pWorld.x, 0, pWorld.z).normalize();
            if (radialDir.lengthSq() < 0.01) radialDir.set(0, 0, 1);

            endCam = pWorld
              .clone()
              .add(radialDir.clone().multiplyScalar(36))
              .add(new THREE.Vector3(0, 14, 0));
          }
        }

        controls.target.lerpVectors(flight.startTargetPos, endTarget, ease);
        camera.position.lerpVectors(flight.startCamPos, endCam, ease);
        controls.update();

        if (progress >= 1.0) {
          flight.isFlying = false;
          if (flight.targetNode && flight.targetNode.user.id !== 'sun-center') {
            flight.isTracking = true;
          }
        }
      } else if (flight.isTracking && flight.targetNode) {
        // Continuous tracking: keep camera locked to the gently revolving planet
        const pWorld = new THREE.Vector3();
        flight.targetNode.sprite.getWorldPosition(pWorld);

        const delta = pWorld.clone().sub(controls.target);
        controls.target.copy(pWorld);
        camera.position.add(delta);
        controls.update();
      } else {
        controls.update();
      }

      // Slow deep-space celestial drift
      starField.rotation.y += 0.00008;
      nebulaField.rotation.y -= 0.00012;

      // Solar Bloom & Anamorphic Flare gentle breathing
      const bloomScale = sunBloomBaseScale * (1.0 + Math.sin(clock * 1.5) * 0.025);
      sunBloomSprite.scale.set(bloomScale, bloomScale, 1);
      sunStreakSprite.material.opacity = 0.35 + Math.sin(clock * 2.0) * 0.05;

      // Shooting Star Animation
      nextShootingStarTime--;
      if (nextShootingStarTime <= 0 && !shootingStarActive) {
        triggerShootingStar();
        nextShootingStarTime = 180 + Math.floor(Math.random() * 240);
      }

      if (shootingStarActive) {
        shootingStarProgress += 0.035;
        const head = new THREE.Vector3().lerpVectors(
          shootingStarStart,
          shootingStarEnd,
          shootingStarProgress
        );
        const tail = new THREE.Vector3().lerpVectors(
          shootingStarStart,
          shootingStarEnd,
          Math.max(0, shootingStarProgress - 0.25)
        );

        const posAttr = shootingStarGeo.attributes.position as THREE.BufferAttribute;
        posAttr.setXYZ(0, head.x, head.y, head.z);
        posAttr.setXYZ(1, tail.x, tail.y, tail.z);
        posAttr.needsUpdate = true;

        shootingStarMat.opacity = Math.sin(shootingStarProgress * Math.PI) * 0.9;

        if (shootingStarProgress >= 1.0) {
          shootingStarActive = false;
          shootingStarMat.opacity = 0;
        }
      }

      // Smart Speed: Slow down when hovering or focused on a planet for effortless inspection
      const isFocused =
        flight.targetNode !== null &&
        flight.targetNode.user.id !== 'sun-center' &&
        (flight.isFlying || flight.isTracking);
      const isHovering = hoveredSpriteRef.current !== null;
      const currentSpeed = isHovering || isFocused
        ? BASE_SPEED * 0.04
        : isPlaying
        ? BASE_SPEED * speedMultiplier
        : 0;

      if (currentSpeed > 0) {
        if (innerGroup) innerGroup.rotation.y += currentSpeed * 1.0;
        if (middleGroup) middleGroup.rotation.y += currentSpeed * 0.65;
        if (outerGroup) outerGroup.rotation.y += currentSpeed * 0.42;
      }

      // Smooth Hover Scale Spring Animation & Beacon highlight
      planetNodesRef.current.forEach((node) => {
        const isTarget = hoveredSpriteRef.current === node.sprite;
        const targetScale = isTarget ? node.baseScale * 1.25 : node.baseScale;
        node.sprite.scale.lerp(new THREE.Vector3(targetScale, targetScale, 1), 0.18);

        if (node.beaconSprite && node.beaconSprite !== sunBloomSprite) {
          const targetBeaconScale = isTarget ? 10 : 6;
          const targetBeaconOpacity = isTarget ? 0.8 : 0.35;
          node.beaconSprite.scale.lerp(new THREE.Vector3(targetBeaconScale, targetBeaconScale, 1), 0.15);
          node.beaconSprite.material.opacity = THREE.MathUtils.lerp(
            node.beaconSprite.material.opacity,
            targetBeaconOpacity,
            0.15
          );
        }
      });

      // 12. Gravitational Resonance Tether & Flowing Photons
      let activeTargetNode: PlanetNodeRef | null = null;
      if (hoveredSpriteRef.current) {
        activeTargetNode =
          planetNodesRef.current.find(
            (n) => n.sprite === hoveredSpriteRef.current && n.user.id !== 'sun-center'
          ) || null;
      }
      if (!activeTargetNode && selectedPlanetUserRef.current && selectedPlanetUserRef.current.id !== 'sun-center') {
        activeTargetNode =
          planetNodesRef.current.find(
            (n) => n.user.id === selectedPlanetUserRef.current?.id
          ) || null;
      }

      if (activeTargetNode) {
        // World coordinates of active friend planet
        const planetWorldPos = new THREE.Vector3();
        activeTargetNode.sprite.getWorldPosition(planetWorldPos);

        const sunWorldPos = new THREE.Vector3(0, 3.5, 0);
        const dist = sunWorldPos.distanceTo(planetWorldPos);

        // Arched gravitational midpoint in 3D space
        const midPoint = new THREE.Vector3()
          .addVectors(sunWorldPos, planetWorldPos)
          .multiplyScalar(0.5);
        midPoint.y += Math.min(22, 6.0 + dist * 0.08);

        const tetherCurve = new THREE.QuadraticBezierCurve3(sunWorldPos, midPoint, planetWorldPos);
        const sampledPoints = tetherCurve.getPoints(TETHER_POINTS - 1);

        const tPosAttr = tetherGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < TETHER_POINTS; i++) {
          tPosAttr.setXYZ(i, sampledPoints[i].x, sampledPoints[i].y, sampledPoints[i].z);
        }
        tPosAttr.needsUpdate = true;

        // Flowing Photons Stream
        const isMutual = activeTargetNode.user.relationship === 'mutual';
        const pPosAttr = photonGeo.attributes.position as THREE.BufferAttribute;
        const pColAttr = photonGeo.attributes.color as THREE.BufferAttribute;

        for (let i = 0; i < PHOTON_COUNT; i++) {
          // Flowing progress
          let progress = (clock * 0.35 + i / PHOTON_COUNT) % 1.0;

          // Bidirectional flow for mutual encounters ("双向奔赴")
          if (isMutual && i % 2 === 1) {
            progress = 1.0 - progress;
          }

          const pt = tetherCurve.getPoint(progress);
          pPosAttr.setXYZ(i, pt.x, pt.y, pt.z);

          if (isMutual) {
            if (i % 2 === 0) {
              // Radiant golden photon from sun
              pColAttr.setXYZ(i, 1.0, 0.85, 0.3);
            } else {
              // Ethereal cyan-violet photon from friend
              pColAttr.setXYZ(i, 0.75, 0.85, 1.0);
            }
          } else {
            pColAttr.setXYZ(i, 1.0, 0.9, 0.5);
          }
        }
        pPosAttr.needsUpdate = true;
        pColAttr.needsUpdate = true;

        // Smoothly fade in tether and photons
        tetherMat.opacity = THREE.MathUtils.lerp(tetherMat.opacity, 0.75, 0.15);
        photonMat.opacity = THREE.MathUtils.lerp(photonMat.opacity, 0.95, 0.15);
      } else {
        // Smoothly fade out
        tetherMat.opacity = THREE.MathUtils.lerp(tetherMat.opacity, 0, 0.12);
        photonMat.opacity = THREE.MathUtils.lerp(photonMat.opacity, 0, 0.12);
      }

      renderer.render(scene, camera);
    };

    animate();

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

  const flyToUser = (user: UserNode) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const node = planetNodesRef.current.find((n) => n.user.id === user.id);
    if (!node) return;

    flightStateRef.current = {
      isFlying: true,
      isTracking: false,
      startTime: performance.now(),
      duration: 1100,
      startCamPos: camera.position.clone(),
      startTargetPos: controls.target.clone(),
      targetNode: node,
    };
  };

  const handleResetCamera = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    flightStateRef.current = {
      isFlying: true,
      isTracking: false,
      startTime: performance.now(),
      duration: 1200,
      startCamPos: camera.position.clone(),
      startTargetPos: controls.target.clone(),
      targetNode: null,
    };
    setSelectedPlanetUser(null);
  };

  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if (dx > 5 || dy > 5) return; // User was dragging the orbit camera, not clicking

    const sprite = getIntersectedSprite(e.clientX, e.clientY);
    if (sprite) {
      const user = clickableSpritesRef.current.get(sprite);
      if (user) {
        setSelectedPlanetUser(user);
        flyToUser(user);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full mx-auto select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 p-0 bg-slate-950' : 'max-w-7xl p-2 sm:p-4'
      }`}
    >
      <div
        className={`relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-indigo-950/80 border border-slate-800/80 bg-slate-950 group ${
          isFullscreen ? 'h-screen rounded-none border-none' : 'h-[620px] sm:h-[740px]'
        }`}
      >
        {/* Three.js Canvas */}
        <div
          ref={mountRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* 1. Top Minimalist Command HUD */}
        <div className="absolute top-4 left-4 flex items-center gap-3 bg-slate-900/85 backdrop-blur-xl px-4 py-2 rounded-2xl border border-slate-800/90 shadow-2xl pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {data.targetUser.name} 的引力星系
            </span>
          </div>

          <div className="h-3.5 w-px bg-slate-800" />

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              星球 <span className="font-bold text-white">{data.innerRing.length + data.middleRing.length + data.outerRing.length}</span> 颗
            </span>
            <span>
              总互动 <span className="font-bold text-indigo-300">{data.stats.totalInteractions.toLocaleString()}</span> 次
            </span>
            <span className="hidden md:inline">
              双向率 <span className="font-bold text-emerald-400">{data.stats.mutualRatio}%</span>
            </span>
          </div>

          {hoveredUser && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 animate-pulse">
              悬停减速中
            </span>
          )}
        </div>

        {/* 2. Top-Right Cosmic Compass Hint */}
        <div className="absolute top-4 right-4 hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-800/70 pointer-events-none shadow-lg">
          <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
          <span>拖拽 360° 运镜 · 滚轮缩放 · 点击星球聚焦</span>
        </div>

        {/* 3. Floating Hover Tooltip */}
        {hoveredUser && !selectedPlanetUser && (
          <div
            className="absolute z-20 pointer-events-none transition-transform duration-75 ease-out"
            style={{
              left: `${tooltipPos.x + 18}px`,
              top: `${tooltipPos.y - 24}px`,
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-3 shadow-2xl shadow-indigo-950/80 max-w-[240px] animate-fade-in">
              <div className="flex items-center gap-2.5">
                <img
                  src={hoveredUser.avatar}
                  alt={hoveredUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-indigo-400/60 bg-slate-800 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{hoveredUser.name}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded font-black bg-indigo-500/20 text-indigo-300">
                      {hoveredUser.rank}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">@{hoveredUser.handle}</p>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                <span className="text-indigo-300">{hoveredUser.badges[0] || '社交行星'}</span>
                <span>{hoveredUser.interactions.total} 次互动</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Slide-out Cosmic Telemetry HUD Card */}
        {selectedPlanetUser && (
          <div className="absolute top-4 bottom-20 right-4 z-30 w-full max-w-[320px] sm:max-w-[340px] animate-slide-left pointer-events-auto">
            <div className="h-full bg-slate-900/90 backdrop-blur-2xl border border-indigo-500/40 rounded-3xl p-5 shadow-2xl shadow-indigo-950/90 flex flex-col justify-between overflow-y-auto">
              <div>
                {/* Header with Close */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                      selectedPlanetUser.rank === 'S'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : selectedPlanetUser.rank === 'A'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {selectedPlanetUser.rank === 'S'
                      ? '核心引力圈 (S 阶)'
                      : selectedPlanetUser.rank === 'A'
                      ? '活跃同频轨道 (A 阶)'
                      : '外围星云 (B 阶)'}
                  </span>

                  <button
                    onClick={() => {
                      setSelectedPlanetUser(null);
                      handleResetCamera();
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Planet Profile */}
                <div className="mt-4 flex items-center gap-3.5">
                  <div className="relative">
                    <img
                      src={selectedPlanetUser.avatar}
                      alt={selectedPlanetUser.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-400/60 shadow-lg shadow-indigo-500/20 bg-slate-800"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-white truncate">
                      {selectedPlanetUser.name}
                    </h3>
                    <p className="text-xs text-indigo-300 font-mono">@{selectedPlanetUser.handle}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 font-medium">
                        {selectedPlanetUser.relationship === 'mutual'
                          ? '✨ 双向奔赴'
                          : selectedPlanetUser.relationship === 'fan'
                          ? '🛡️ 死忠守护'
                          : '👁️ 重点关注'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Concise High-Efficiency Metrics Grid */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                      <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>回复互动</span>
                    </div>
                    <span className="text-lg font-black text-white">
                      {selectedPlanetUser.interactions.replies}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">次</span>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                      <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                      <span>转推传播</span>
                    </div>
                    <span className="text-lg font-black text-white">
                      {selectedPlanetUser.interactions.retweets}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">次</span>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                      <Quote className="w-3.5 h-3.5 text-purple-400" />
                      <span>引用探讨</span>
                    </div>
                    <span className="text-lg font-black text-white">
                      {selectedPlanetUser.interactions.quotes}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">次</span>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>综合引力分</span>
                    </div>
                    <span className="text-lg font-black text-amber-300">
                      {selectedPlanetUser.score}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">pt</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {selectedPlanetUser.badges.map((b) => (
                    <span
                      key={b}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                    >
                      #{b}
                    </span>
                  ))}
                </div>

                {/* 在星辰中相遇 · 浪漫引力纪事与星历卡生成 */}
                {selectedPlanetUser.id !== 'sun-center' && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-indigo-950/40 to-slate-900/90 border border-amber-500/35 shadow-xl shadow-amber-950/20">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        在星辰中相遇 · 纪念纪事
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                        {selectedPlanetUser.relationship === 'mutual' ? '双星引力共振' : '引力轨道捕获'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic leading-relaxed">
                      “每一个关注，都是引力的捕获；每一条回复，都是跨越光年的回响。”
                    </p>
                    <button
                      onClick={() => setIsEncounterModalOpen(true)}
                      className="mt-2.5 w-full py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer group"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950 group-hover:rotate-12 transition-transform" />
                      <span>生成双星相遇星历卡 (16:9)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                <button
                  onClick={() => flyToUser(selectedPlanetUser)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>镜头聚焦特写</span>
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://x.com/${selectedPlanetUser.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>访问 X 主页</span>
                  </a>

                  <button
                    onClick={() => onSelectUser(selectedPlanetUser)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="展开完整互动档案明细"
                  >
                    <Award className="w-3.5 h-3.5 text-purple-400" />
                    <span>档案</span>
                  </button>

                  <button
                    onClick={handleResetCamera}
                    className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all cursor-pointer"
                    title="复位至全局星系俯视"
                  >
                    <span>全局</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Minimalist Orbit Legend (Bottom Left) */}
        <div className="absolute bottom-4 left-4 hidden sm:flex items-center gap-3 bg-slate-900/85 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-slate-800/90 shadow-2xl pointer-events-none text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-sm shadow-amber-300/50" />
            <span className="text-slate-300">核心星系 (S)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-300 shadow-sm shadow-purple-300/50" />
            <span className="text-slate-300">中层轨道 (A)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-sm shadow-cyan-300/50" />
            <span className="text-slate-300">外层星云 (B)</span>
          </div>
        </div>

        {/* 6. Speed & Cosmic Control Deck (Bottom Right) */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl border border-slate-800/90 shadow-2xl">
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
              { label: '0.3x', val: 0.3, tip: '惬意慢速' },
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
            title="复位至全局视角"
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏沉浸漫游'}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-300" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* 7. Dual Star Encounter Poster Generator Modal */}
        {selectedPlanetUser && selectedPlanetUser.id !== 'sun-center' && (
          <EncounterModal
            isOpen={isEncounterModalOpen}
            onClose={() => setIsEncounterModalOpen(false)}
            targetUser={data.targetUser}
            friend={selectedPlanetUser}
          />
        )}
      </div>
    </div>
  );
};
