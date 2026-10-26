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

    // 1. Ethereal Twilight Cosmic Background
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, w * 0.75);
    bgGrad.addColorStop(0, '#0e1638');
    bgGrad.addColorStop(0.4, '#080d24');
    bgGrad.addColorStop(1, '#040614');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Dreamlike Aurora Nebula Clouds (Soft additive celestial dust)
    const drawNebula = (cx: number, cy: number, r: number, color: string) => {
      const nebGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      nebGrad.addColorStop(0, color);
      nebGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };

    drawNebula(w * 0.32, h * 0.46, 420, 'rgba(251, 191, 36, 0.12)'); // Honey amber aura around Sun
    drawNebula(w * 0.68, h * 0.46, 400, 'rgba(192, 132, 252, 0.14)'); // Lavender aurora around Friend
    drawNebula(w * 0.5, h * 0.42, 340, 'rgba(244, 114, 182, 0.09)'); // Rose starlight at bridge

    // 3. Delicate Constellation Lines & Twinkling Starlight
    const starCoords: [number, number][] = [];
    for (let i = 0; i < 180; i++) {
      const sx = (i * 97) % w;
      const sy = (i * 139) % h;
      starCoords.push([sx, sy]);
      const alpha = 0.25 + ((i * 19) % 75) / 100;
      const sRadius = i % 7 === 0 ? 2.2 : i % 3 === 0 ? 1.6 : 1.0;

      ctx.fillStyle =
        i % 4 === 0
          ? `rgba(254, 240, 138, ${alpha})`
          : i % 3 === 0
          ? `rgba(244, 114, 182, ${alpha * 0.8})`
          : `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Connect close stars with faint ethereal constellation hairlines
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.08)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 24; i++) {
      const p1 = starCoords[i * 7 % starCoords.length];
      const p2 = starCoords[(i * 7 + 3) % starCoords.length];
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }

    // 4. Coordinates of the Two Stars
    const leftX = w * 0.31;
    const leftY = h * 0.49;
    const rightX = w * 0.69;
    const rightY = h * 0.49;
    const avatarR = 68;

    // 5. Celestial Braided Light Ribbon (心火光织)
    const midX = (leftX + rightX) / 2;
    const midY = leftY - 48;

    ctx.save();
    // Broad glowing wave aura
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.28)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.quadraticCurveTo(midX, midY, rightX, rightY);
    ctx.stroke();

    // Rose starlight secondary strand
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.45)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY + 2);
    ctx.quadraticCurveTo(midX, midY - 6, rightX, rightY + 2);
    ctx.stroke();

    // Core pearlescent hairline strand
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.quadraticCurveTo(midX, midY, rightX, rightY);
    ctx.stroke();
    ctx.restore();

    // Stardust Spark Photons streaming along the ribbon
    for (let p = 1; p <= 9; p++) {
      const t = p / 10;
      const px = (1 - t) * (1 - t) * leftX + 2 * (1 - t) * t * midX + t * t * rightX;
      const py = (1 - t) * (1 - t) * leftY + 2 * (1 - t) * t * midY + t * t * rightY;

      const pGrad = ctx.createRadialGradient(px, py, 0, px, py, 14);
      pGrad.addColorStop(0, '#ffffff');
      pGrad.addColorStop(0.35, p % 2 === 0 ? 'rgba(251, 191, 36, 0.9)' : 'rgba(244, 114, 182, 0.85)');
      pGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central Sacred Resonance Seal
    const badgeText = `✦ 灵魂同频 ${friend.score}% ✦`;
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const bWidth = ctx.measureText(badgeText).width + 36;
    const bHeight = 34;

    ctx.fillStyle = 'rgba(12, 17, 38, 0.94)';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(midX - bWidth / 2, midY - 26, bWidth, bHeight, 17);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, midX, midY - 9);

    // 6. Draw Avatar Node Helper (Celestial Star Jewel)
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
      // Atmospheric Pearlescent Outer Halo
      const halo = ctx.createRadialGradient(x, y, r * 0.75, x, y, r * 1.55);
      halo.addColorStop(0, glowColor);
      halo.addColorStop(0.6, glowColor.replace(/[\d\.]+\)$/, '0.22)'));
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.55, 0, Math.PI * 2);
      ctx.fill();

      // Disc Background
      ctx.fillStyle = '#070c1e';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Avatar image
      const img = await loadImage(avatarUrl);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r - 4, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - (r - 4), y - (r - 4), (r - 4) * 2, (r - 4) * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = borderColor;
        ctx.font = 'bold 52px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((name || handle).charAt(0).toUpperCase(), x, y);
      }

      // Outer Border Ring
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(x, y, r - 2, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Hairline Starlight Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, y, r - 5, 0, Math.PI * 2);
      ctx.stroke();

      // Four Cardinal Diamond Sparkles
      const drawDiamond = (dx: number, dy: number) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(dx, dy - 5);
        ctx.lineTo(dx + 3, dy);
        ctx.lineTo(dx, dy + 5);
        ctx.lineTo(dx - 3, dy);
        ctx.closePath();
        ctx.fill();
      };
      drawDiamond(x, y - r + 3);
      drawDiamond(x + r - 3, y);
      drawDiamond(x, y + r - 3);
      drawDiamond(x - r + 3, y);

      // Role Pill Tag
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      const rPillW = ctx.measureText(roleBadge).width + 26;
      const rPillH = 28;
      ctx.fillStyle = 'rgba(7, 12, 30, 0.94)';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(x - rPillW / 2, y + r + 12, rPillW, rPillH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(roleBadge, x, y + r + 26);

      // User Name & Handle below
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(name, x, y + r + 58);

      ctx.font = '500 13px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`@${handle}`, x, y + r + 78);
    };

    // Draw Left Star: Target User (Sun Core)
    await drawAvatar(
      leftX,
      leftY,
      avatarR,
      targetUser.avatar,
      targetUser.name,
      targetUser.handle,
      '☀️ 恒心之火',
      'rgba(253, 224, 71, 0.55)',
      '#fde047'
    );

    // Draw Right Star: Friend (Orbiting Planet)
    const friendRoleBadge =
      friend.relationship === 'mutual'
        ? '✨ 灵魂同频伴星'
        : friend.relationship === 'fan'
        ? '🕊️ 恒常守护伴星'
        : '💫 遥相瞩目伴星';

    const friendBorderColor =
      friend.rank === 'S' ? '#fbbf24' : friend.rank === 'A' ? '#c084fc' : '#67e8f9';

    await drawAvatar(
      rightX,
      rightY,
      avatarR,
      friend.avatar,
      friend.name,
      friend.handle,
      friendRoleBadge,
      friend.rank === 'S'
        ? 'rgba(251, 191, 36, 0.45)'
        : 'rgba(192, 132, 252, 0.4)',
      friendBorderColor
    );

    // 7. Top Header Typography: "我们在星辰中相遇"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Subtitle Pill
    const tagText = '✦ CYBER CELESTIAL ENCOUNTER · 赛博引力纪事 ✦';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(tagText, w / 2, 38);

    // Main Title with Golden Starlight Glow
    ctx.font = '900 40px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('我们在星辰中相遇', w / 2, 60);

    // Golden Poetic Verses
    ctx.font = '500 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(
      '“世间所有的相遇，都是久别重逢的引力”',
      w / 2,
      112
    );

    ctx.font = '400 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(
      '“在漫无边际的赛博荒原上，每一次回应，都是暗夜里为你点亮的一簇火光。”',
      w / 2,
      134
    );
    ctx.restore();

    // 8. Bottom Telemetry Bar: Detailed Interaction Stats
    const bottomY = h - 68;
    const statsSummary = `累计互赠了 ${friend.interactions.replies} 束心绪电波 · 引力潮汐共鸣 ${friend.interactions.total} 次 · 灵魂同频度 ${friend.score}%`;
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText(statsSummary, w / 2, bottomY);

    // Brand Watermark
    ctx.font = '500 11px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      `OpenXCircle · 赛博星历 ${new Date().toLocaleDateString()} · 愿微光在星海中永远交相辉映`,
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
  const tweetText = `在浩瀚的赛博荒原中，我与 @${friend.handle} 产生了 ${friend.score}% 的灵魂共鸣，跨越光年相遇。✨\n“世间所有的相遇，都是久别重逢的引力；每一次回应，都是暗夜里为你点亮的一簇火光。”\n编织你的星辰画卷：https://xiun1ng.github.io/OpenXCircle/ #OpenXCircle #在星辰中相遇`;

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
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-indigo-950/90 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                我们在星辰中相遇 · 赛博引力信物
              </h2>
              <p className="text-xs text-slate-400">
                赠予 @{friend.handle} · 愿我们的微光在赛博星海中永远交相辉映
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
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm text-xs text-amber-200 font-medium">
                正在编织唯美星辰画卷...
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <span>灵魂同频度: </span>
            <span className="font-bold text-amber-400">{friend.score}%</span> · 累计互赠心绪电波{' '}
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
              <span>在 X 上艾特 TA 赠予信物</span>
            </button>

            {/* Download Poster Button */}
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载纪念画卷 (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
