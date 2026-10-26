import type { CircleData, CustomizationSettings, ThemeConfig } from '../types';

// Cache loaded HTMLImageElement to avoid re-fetching on every frame
const imageCache = new Map<string, HTMLImageElement | 'failed'>();

// Pre-computed starfield positions for high performance
interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
}
let cachedStars: Star[] = [];

function getStars(width: number, height: number): Star[] {
  if (cachedStars.length === 80) return cachedStars;
  const stars: Star[] = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: (((Math.sin(i * 997) * 10000) % width) + width) % width,
      y: (((Math.cos(i * 7919) * 10000) % height) + height) % height,
      size: ((i % 3) + 1) * 0.8,
      alpha: ((i % 5) + 3) * 0.08,
    });
  }
  cachedStars = stars;
  return stars;
}

export function preloadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  if (imageCache.has(url)) {
    const cached = imageCache.get(url);
    return Promise.resolve(cached === 'failed' ? null : cached || null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.src = url;

    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };

    img.onerror = () => {
      imageCache.set(url, 'failed');
      resolve(null);
    };
  });
}

export function drawCircleCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: CircleData,
  theme: ThemeConfig,
  settings: CustomizationSettings,
  rotationAngle: number = 0
) {
  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);

  // 1. Draw Background Gradient
  const bgGrad = ctx.createRadialGradient(cx, cy, minDim * 0.1, cx, cy, minDim * 0.7);
  bgGrad.addColorStop(0, theme.bgGradient[1]);
  bgGrad.addColorStop(0.7, theme.bgGradient[0]);
  bgGrad.addColorStop(1, theme.bgGradient[2]);

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. High performance background starfield
  drawStarfield(ctx, width, height, theme);

  // 3. Central Glow Aura
  const centerAura = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.35);
  centerAura.addColorStop(0, `${theme.glowColor}25`);
  centerAura.addColorStop(0.5, `${theme.glowColor}08`);
  centerAura.addColorStop(1, 'transparent');
  ctx.fillStyle = centerAura;
  ctx.fillRect(0, 0, width, height);

  // Radii for orbits
  const r1 = minDim * 0.20; // Inner ring
  const r2 = minDim * 0.33; // Middle ring
  const r3 = minDim * 0.44; // Outer ring

  const ringsToDraw = settings.ringCount === 2 ? [r1, r2] : [r1, r2, r3];

  // 4. Draw Orbit Tracks (Dashed glowing concentric circles)
  ringsToDraw.forEach((r, idx) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = theme.ringColors[idx] || theme.ringColors[0];
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  });

  // 5. Draw Target User in Center
  if (settings.showCenterAvatar) {
    const centerRadius = minDim * 0.075;
    drawAvatarNode(
      ctx,
      cx,
      cy,
      centerRadius,
      data.targetUser.avatar,
      data.targetUser.name || data.targetUser.handle,
      `@${data.targetUser.handle}`,
      theme,
      true, // isCenter
      settings.showHandles
    );
  }

  // 6. Draw Orbiting Users
  // Ring 1 (Inner: ~8 users)
  drawOrbitUsers(
    ctx,
    cx,
    cy,
    r1,
    data.innerRing,
    settings.avatarSize * (minDim / 800) * 1.05,
    rotationAngle,
    theme,
    settings.showHandles,
    true // showLabels
  );

  // Ring 2 (Middle: ~15 users)
  drawOrbitUsers(
    ctx,
    cx,
    cy,
    r2,
    data.middleRing,
    settings.avatarSize * (minDim / 800) * 0.88,
    -rotationAngle * 0.65 + 0.5,
    theme,
    settings.showHandles,
    true // showLabels
  );

  // Ring 3 (Outer: ~24 users)
  if (settings.ringCount === 3 && data.outerRing.length > 0) {
    drawOrbitUsers(
      ctx,
      cx,
      cy,
      r3,
      data.outerRing,
      settings.avatarSize * (minDim / 800) * 0.72,
      rotationAngle * 0.4 + 1.2,
      theme,
      settings.showHandles,
      false // on outer ring, omit handles or keep compact to prevent overlap
    );
  }

  // 7. Watermark & Branding Header/Footer
  drawBranding(ctx, width, height, data, theme, settings);
}

// Draw starfield (optimized, 0 trig calculations per frame)
function drawStarfield(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig) {
  const stars = getStars(width, height);
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    ctx.fillStyle = i % 2 === 0 ? `rgba(255, 255, 255, ${s.alpha})` : `${theme.glowColor}33`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
}

// Draw users on an orbit
function drawOrbitUsers(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  users: CircleData['innerRing'],
  nodeRadius: number,
  baseAngle: number,
  theme: ThemeConfig,
  showHandles: boolean,
  showLabelsOnRing: boolean = true
) {
  if (!users || users.length === 0) return;
  const count = users.length;
  const step = (Math.PI * 2) / count;

  users.forEach((user, idx) => {
    const angle = baseAngle + idx * step;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    drawAvatarNode(
      ctx,
      x,
      y,
      nodeRadius,
      user.avatar,
      user.name,
      `@${user.handle}`,
      theme,
      false,
      showHandles && showLabelsOnRing
    );
  });
}

// Draw single avatar
function drawAvatarNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  avatarUrl: string,
  name: string,
  handle: string,
  theme: ThemeConfig,
  isCenter: boolean = false,
  showHandles: boolean = true
) {
  ctx.save();

  // Glow Halo (optimized)
  ctx.beginPath();
  ctx.arc(x, y, radius + (isCenter ? 5 : 2), 0, Math.PI * 2);
  ctx.fillStyle = isCenter ? `${theme.accentColor}44` : `${theme.glowColor}25`;
  ctx.fill();

  // Outer Border ring
  ctx.lineWidth = isCenter ? 3 : 1.5;
  ctx.strokeStyle = isCenter ? theme.accentColor : theme.ringColors[0];
  ctx.stroke();

  // Clip avatar circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  const cachedImg = imageCache.get(avatarUrl);

  if (cachedImg && cachedImg !== 'failed' && cachedImg.complete && cachedImg.naturalWidth > 0) {
    ctx.drawImage(cachedImg, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    // Fallback: gradient circle with initial letter
    const initial = (name || handle || '?').replace('@', '').charAt(0).toUpperCase();
    const fallbackGrad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    fallbackGrad.addColorStop(0, theme.accentColor);
    fallbackGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = fallbackGrad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(radius * 0.9)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, x, y);
  }

  ctx.restore();

  // Draw user handle under avatar (GPU-optimized: NO heavy shadowBlur!)
  if (showHandles && !isCenter && radius > 14) {
    ctx.save();
    ctx.font = `600 ${Math.max(9, Math.round(radius * 0.42))}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const displayHandle = handle.length > 11 ? handle.substring(0, 10) + '…' : handle;

    // Stroke text for crisp contrast without CPU-killing shadow blur
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeText(displayHandle, x, y + radius + 3);

    ctx.fillStyle = theme.textColor;
    ctx.fillText(displayHandle, x, y + radius + 3);
    ctx.restore();
  }
}

// Branding & Watermark
function drawBranding(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: CircleData,
  theme: ThemeConfig,
  settings: CustomizationSettings
) {
  ctx.save();

  // Top Left: Brand Header
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = theme.textColor;
  ctx.fillText('OpenXCircle', 32, 42);

  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = `${theme.textColor}99`;
  ctx.fillText(`@${data.targetUser.handle} · 社交互动宇宙`, 32, 64);

  // Bottom Left: Meta stats
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = `${theme.textColor}77`;
  const dateStr = new Date(data.generatedAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  ctx.fillText(`生成时间: ${dateStr} · 互撩指数: ${data.stats.mutualRatio}%`, 32, height - 32);

  // Bottom Right: Watermark
  if (settings.showWatermark) {
    ctx.textAlign = 'right';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillStyle = theme.accentColor;
    ctx.fillText(settings.watermarkText, width - 32, height - 32);

    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = `${theme.textColor}66`;
    ctx.fillText('GitHub 开源 · 零后端 · 隐私无漏', width - 32, height - 16);
  }

  ctx.restore();
}
