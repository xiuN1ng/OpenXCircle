import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Download, Sparkles, Copy, Check, X } from 'lucide-react';
import type { UserNode, TargetUser } from '../types';

interface EncounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: TargetUser;
  friend: UserNode | null;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  friend,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [isRendering, setIsRendering] = useState(true);

  // Helper to load image safely
  const loadImage = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const drawEncounterPoster = useCallback(async () => {
    if (!friend) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRendering(true);
    const ctx = canvas.getContext('2d')!;
    const w = 1200;
    const h = 675; // 16:9 cinematic aspect ratio

    canvas.width = w;
    canvas.height = h;

    // 1. Deep Space Cosmic Background
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, w * 0.75);
    bgGrad.addColorStop(0, '#0c1222');
    bgGrad.addColorStop(0.5, '#050814');
    bgGrad.addColorStop(1, '#020308');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Cosmic Nebula Clouds (Soft additive stardust)
    const drawNebula = (cx: number, cy: number, r: number, color: string) => {
      const nebGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      nebGrad.addColorStop(0, color);
      nebGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };

    drawNebula(w * 0.3, h * 0.45, 380, 'rgba(99, 102, 241, 0.12)');
    drawNebula(w * 0.7, h * 0.55, 360, 'rgba(192, 132, 252, 0.10)');
    drawNebula(w * 0.5, h * 0.5, 300, 'rgba(251, 191, 36, 0.08)');

    // 3. Twinkling Stars in Deep Space
    for (let i = 0; i < 220; i++) {
      const sx = (i * 97) % w;
      const sy = (i * 139) % h;
      const alpha = 0.2 + ((i * 17) % 80) / 100;
      const sRadius = (i % 5 === 0) ? 2.2 : 1.2;

      ctx.fillStyle = i % 3 === 0 ? `rgba(254, 240, 138, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Coordinates of the Two Stars
    const leftX = w * 0.32;
    const leftY = h * 0.48;
    const rightX = w * 0.68;
    const rightY = h * 0.48;
    const avatarR = 64;

    // 5. Gravitational Resonance Wave (Curved luminous beam connecting the stars)
    const midX = (leftX + rightX) / 2;
    const midY = leftY - 45;

    // Glowing wave backings
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.quadraticCurveTo(midX, midY, rightX, rightY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(254, 240, 138, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.quadraticCurveTo(midX, midY, rightX, rightY);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.quadraticCurveTo(midX, midY, rightX, rightY);
    ctx.stroke();
    ctx.restore();

    // Stardust Photons streaming along the wave
    for (let p = 1; p <= 7; p++) {
      const t = p / 8;
      const px = (1 - t) * (1 - t) * leftX + 2 * (1 - t) * t * midX + t * t * rightX;
      const py = (1 - t) * (1 - t) * leftY + 2 * (1 - t) * t * midY + t * t * rightY;

      const pGrad = ctx.createRadialGradient(px, py, 0, px, py, 12);
      pGrad.addColorStop(0, '#ffffff');
      pGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.8)');
      pGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central Resonance Percentage Badge
    const badgeText = `${friend.score}% 引力共振`;
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    const bWidth = ctx.measureText(badgeText).width + 32;
    const bHeight = 32;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(midX - bWidth / 2, midY - 24, bWidth, bHeight, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, midX, midY - 8);

    // 6. Draw Avatar Node Helper
    const drawAvatar = async (
      x: number,
      y: number,
      r: number,
      avatarUrl: string,
      name: string,
      handle: string,
      roleBadge: string,
      glowColor: string,
      borderColor: string
    ) => {
      // Atmospheric Outer Halo
      const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.45);
      halo.addColorStop(0, glowColor);
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // Disc Background
      ctx.fillStyle = '#0a0e1c';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Try load avatar image
      const img = await loadImage(avatarUrl);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r - 3, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - (r - 3), y - (r - 3), (r - 3) * 2, (r - 3) * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = borderColor;
        ctx.font = 'bold 48px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((name || handle).charAt(0).toUpperCase(), x, y);
      }

      // Border Ring
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r - 2, 0, Math.PI * 2);
      ctx.stroke();

      // Role Pill Tag
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      const rPillW = ctx.measureText(roleBadge).width + 24;
      const rPillH = 26;
      ctx.fillStyle = 'rgba(10, 15, 30, 0.95)';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - rPillW / 2, y + r + 10, rPillW, rPillH, 13);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(roleBadge, x, y + r + 23);

      // User Name & Handle below
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(name, x, y + r + 55);

      ctx.font = '500 13px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`@${handle}`, x, y + r + 75);
    };

    // Draw Left Star: Target User (Sun Core)
    await drawAvatar(
      leftX,
      leftY,
      avatarR,
      targetUser.avatar,
      targetUser.name,
      targetUser.handle,
      '☀️ 恒星引力原点',
      'rgba(251, 191, 36, 0.45)',
      '#fbbf24'
    );

    // Draw Right Star: Friend (Orbiting Planet)
    const friendRoleBadge =
      friend.relationship === 'mutual'
        ? '✨ 双向奔赴行星'
        : friend.relationship === 'fan'
        ? '🛡️ 死忠守护行星'
        : '👁️ 重点关注行星';

    const friendBorderColor =
      friend.rank === 'S' ? '#f59e0b' : friend.rank === 'A' ? '#c084fc' : '#38bdf8';

    await drawAvatar(
      rightX,
      rightY,
      avatarR,
      friend.avatar,
      friend.name,
      friend.handle,
      friendRoleBadge,
      friend.rank === 'S'
        ? 'rgba(245, 158, 11, 0.4)'
        : 'rgba(192, 132, 252, 0.35)',
      friendBorderColor
    );

    // 7. Top Header Typography: "我们在星辰中相遇"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Subtitle Pill
    const tagText = 'CYBER COSMIC ENCOUNTER · 赛博引力纪事';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#818cf8';
    ctx.fillText(tagText, w / 2, 42);

    // Main Title
    ctx.font = '900 38px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('在星辰中相遇', w / 2, 64);

    // Golden Poetic Quote
    ctx.font = '500 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(
      '“每一个关注，都是引力的捕获；每一条回复，都是跨越光年的回响。”',
      w / 2,
      115
    );
    ctx.restore();

    // 8. Bottom Telemetry Bar: Detailed Interaction Stats
    const bottomY = h - 65;
    const statsSummary = `累计互发了 ${friend.interactions.replies} 次跨光年信号 · ${friend.interactions.total} 次引力潮汐共振 · 引力指数 ${friend.score} pt`;
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText(statsSummary, w / 2, bottomY);

    // Brand Watermark
    ctx.font = '500 11px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      `OpenXCircle · 赛博星历 ${new Date().toLocaleDateString()} · 100% 纯前端开源探索`,
      w / 2,
      bottomY + 24
    );

    setIsRendering(false);
  }, [friend, targetUser]);

  useEffect(() => {
    if (isOpen && friend) {
      setTimeout(() => {
        drawEncounterPoster();
      }, 50);
    }
  }, [isOpen, friend, drawEncounterPoster]);

  if (!isOpen || !friend) return null;

  // Download high-resolution PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Encounter-${targetUser.handle}-with-${friend.handle}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Canvas export error:', err);
      handleCopyText();
    }
  };

  // One-click tweet text
  const tweetText = `在浩瀚的 X 星海中，我与 @${friend.handle} 产生了 ${friend.score}% 的引力共鸣，跨越光年相遇。✨\n“每一个关注，都是引力的捕获；每一条回复，都是跨越光年的回响。”\n探索你的赛博星系：https://xiun1ng.github.io/OpenXCircle/ #OpenXCircle #在星辰中相遇`;

  const handleShareToX = () => {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(shareUrl, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(tweetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-indigo-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-indigo-950/90 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                双星星历纪事 · 在星辰中相遇
              </h2>
              <p className="text-xs text-slate-400">
                记录你与 @{friend.handle} 在赛博星海中的专属引力交会
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Poster Canvas Preview */}
        <div className="mt-4 flex-1 flex flex-col items-center justify-center">
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-slate-800/90 shadow-2xl bg-slate-950 flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full object-contain block" />
            {isRendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm text-xs text-indigo-300 font-medium">
                正在绘制超清星历纪事...
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <span>引力共振度: </span>
            <span className="font-bold text-amber-400">{friend.score}%</span> · 累计互发信号{' '}
            <span className="font-bold text-white">{friend.interactions.replies}</span> 次
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Copy Quote Button */}
            <button
              onClick={handleCopyText}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制文案' : '复制诗意文案'}</span>
            </button>

            {/* Share to X Button */}
            <button
              onClick={handleShareToX}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>在 X 上艾特 TA</span>
            </button>

            {/* Download Poster Button */}
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载星历卡 (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
