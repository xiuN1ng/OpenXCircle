import React, { useState } from 'react';
import { Download, X, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { drawCircleCanvas } from '../core/canvasRenderer';
import { THEMES } from '../core/themes';
import type { CircleData, CustomizationSettings } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CircleData;
  settings: CustomizationSettings;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  data,
  settings,
}) => {
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [resolution, setResolution] = useState<2000 | 4000>(2000);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      // Create offscreen canvas for crisp export
      const offCanvas = document.createElement('canvas');
      let w: number = resolution;
      let h: number = resolution;

      if (aspectRatio === '9:16') {
        w = Math.round((resolution * 9) / 16);
        h = resolution;
      } else if (aspectRatio === '16:9') {
        w = resolution;
        h = Math.round((resolution * 9) / 16);
      }

      offCanvas.width = w;
      offCanvas.height = h;

      const ctx = offCanvas.getContext('2d');
      if (!ctx) throw new Error('无法创建绘图上下文');

      const theme = THEMES[settings.theme] || THEMES.cosmic;
      drawCircleCanvas(ctx, w, h, data, theme, settings, 0);

      // Convert to blob and download
      offCanvas.toBlob((blob) => {
        if (!blob) {
          alert('生成图像失败');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OpenXCircle-${data.targetUser.handle}-${aspectRatio.replace(':', 'x')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Confetti celebration!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });

        setIsExporting(false);
        onClose();
      }, 'image/png', 1.0);
    } catch (err) {
      console.error(err);
      alert('导出失败: ' + (err as Error).message);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-indigo-950/40">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">导出高清海报</h3>
            <p className="text-xs text-slate-400">支持 4K 无损画质，适合直接发推或手机长图</p>
          </div>
        </div>

        {/* Aspect Ratio Options */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              画幅比例
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '1:1', label: '1 : 1 方形', desc: '推文配图推荐' },
                { id: '9:16', label: '9 : 16 坚屏', desc: '手机壁纸 / 故事' },
                { id: '16:9', label: '16 : 9 横屏', desc: '电脑壁纸 / 封面' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAspectRatio(item.id as '1:1' | '9:16' | '16:9')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    aspectRatio === item.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Options */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              输出分辨率
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { res: 2000, label: '2K 超清 (2000px)', tag: '推荐 / 极速' },
                { res: 4000, label: '4K 影院级 (4000px)', tag: '极致细节' },
              ].map((item) => (
                <button
                  key={item.res}
                  type="button"
                  onClick={() => setResolution(item.res as 2000 | 4000)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    resolution === item.res
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-indigo-400 mt-0.5">{item.tag}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <span>正在渲染超清海报...</span>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>立即下载 PNG 海报</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
