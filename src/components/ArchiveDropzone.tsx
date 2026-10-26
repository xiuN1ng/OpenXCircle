import React, { useState, useRef } from 'react';
import { UploadCloud, FileArchive, ShieldCheck, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseTwitterArchive } from '../core/archiveParser';
import type { CircleData } from '../types';

interface ArchiveDropzoneProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: CircleData) => void;
}

export const ArchiveDropzone: React.FC<ArchiveDropzoneProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const data = await parseTwitterArchive(file);
      onSuccess(data);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message || '解析归档文件出错，请确保是 Twitter 官方归档。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <FileArchive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              导入 X 官方归档数据
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 100% 浏览器本地解析
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              数据仅留在你的浏览器本地内存中运算，零网络请求、零泄露风险。
            </p>
          </div>
        </div>

        {/* Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-800/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.js,.json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleProcessFile(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {isProcessing ? '正在解压并计算全量互动图谱...' : '点击或将文件拖拽至此处'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                支持推特官方归档包 <code className="text-indigo-300">.zip</code> 或单独拖入 <code className="text-indigo-300">tweets.js</code>
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* How to get Twitter archive tutorial */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>如何获取 X (Twitter) 官方归档？</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 leading-relaxed">
            <li>打开推特网页，进入「设置与隐私 (Settings and privacy)」；</li>
            <li>点击「你的账号 (Your account)」➔「下载数据归档 (Download an archive of your data)」；</li>
            <li>通常几小时后推特会邮件通知你下载 zip 包，直接将该 zip 拖入本页面即可！</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
