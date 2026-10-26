import type { CircleData, CustomizationSettings, ThemeConfig } from '../types';

// Cache loaded HTMLImageElement to avoid re-fetching on every frame
const imageCache = new Map<string, HTMLImageElement | 'failed'>();

export function preloadImage(url: string): Promise<HTMLImageElement | null> {
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

  // 2. Background Starfield / Particle Dust
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
    ctx.shadowColor = theme.glowColor;
    ctx.shadowBlur = 8;
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
  // Ring 1 (Inner)
  drawOrbitUsers(
    ctx,
    cx,
    cy,
    r1,
    data.innerRing,
    settings.avatarSize * (minDim / 800) * 1.1,
    rotationAngle,
    theme,
    settings.showHandles
  );

  // Ring 2 (Middle - rotates opposite or slightly slower)
  drawOrbitUsers(
    ctx,
    cx,
    cy,
    r2,
    data.middleRing,
    settings.avatarSize * (minDim / 800) * 0.95,
    -rotationAngle * 0.65 + 0.5,
    theme,
    settings.showHandles
  );

  // Ring 3 (Outer)
  if (settings.ringCount === 3 && data.outerRing.length > 0) {
    drawOrbitUsers(
      ctx,
      cx,
      cy,
      r3,
      data.outerRing,
      settings.avatarSize * (minDim / 800) * 0.8,
      rotationAngle * 0.4 + 1.2,
      theme,
      settings.showHandles
    );
  }

  // 7. Watermark & Branding Header/Footer
  drawBranding(ctx, width, height, data, theme, settings);
}

// Draw starfield
function drawStarfield(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig) {
  ctx.save();
  const starCount = 80;
  // Fixed deterministic positions based on index
  for (let i = 0; i < starCount; i++) {
    const x = ((Math.sin(i * 997) * 10000) % width + width) % width;
    const y = ((Math.cos(i * 7919) * 10000) % height + height) % height;
    const size = ((i % 3) + 1) * 0.8;
    const alpha = ((i % 5) + 3) * 0.08;

    ctx.fillStyle = i % 2 === 0 ? `rgba(255, 255, 255, ${alpha})` : `${theme.glowColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
  showHandles: boolean
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
      showHandles
    );
  });
}

// Draw single avatar with fallback to letter initials if image CORS blocks
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

  // Glow Halo
  ctx.beginPath();
  ctx.arc(x, y, radius + (isCenter ? 6 : 3), 0, Math.PI * 2);
  ctx.fillStyle = isCenter ? `${theme.accentColor}44` : `${theme.glowColor}25`;
  ctx.fill();

  // Outer Border ring
  ctx.lineWidth = isCenter ? 3.5 : 2;
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
    // Elegant fallback: gradient circle with initial letter
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

  // Draw user handle under avatar
  if (showHandles && !isCenter && radius > 14) {
    ctx.save();
    ctx.font = `500 ${Math.max(9, Math.round(radius * 0.45))}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Label shadow for legibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = theme.textColor;
    const displayHandle = handle.length > 12 ? handle.substring(0, 11) + '…' : handle;
    ctx.fillText(displayHandle, x, y + radius + 4);
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
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = theme.textColor;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 6;
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
