import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { SearchBanner } from './components/SearchBanner';
import { OrbitView } from './components/OrbitView';
import { TierListView } from './components/TierListView';
import { InsightsView } from './components/InsightsView';
import { ControlPanel } from './components/ControlPanel';
import { ArchiveDropzone } from './components/ArchiveDropzone';
import { ExportModal } from './components/ExportModal';
import { DEMO_CIRCLE_DATA } from './core/demoData';
import { fetchOnlineCircle } from './core/onlineFetcher';
import type { CircleData, CustomizationSettings } from './types';
import { Shield } from 'lucide-react';

export function App() {
  const [data, setData] = useState<CircleData>(DEMO_CIRCLE_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [settings, setSettings] = useState<CustomizationSettings>({
    theme: 'cosmic',
    watermarkText: 'OpenXCircle · 纯开源零后端',
    showWatermark: true,
    showHandles: true,
    showCenterAvatar: true,
    ringCount: 3,
    avatarSize: 38,
    rotationSpeed: 1,
    viewMode: 'orbit',
    exportScale: 2,
  });

  const handleUpdateSettings = (newSettings: Partial<CustomizationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleSearch = async (handle: string) => {
    setIsLoading(true);
    try {
      const result = await fetchOnlineCircle(handle);
      setData(result);
    } catch (err) {
      alert((err as Error).message || '获取推特数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = () => {
    setData(DEMO_CIRCLE_DATA);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center">
        {/* Search & Input Banner */}
        <SearchBanner
          onSearch={handleSearch}
          onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
          onLoadDemo={handleLoadDemo}
          isLoading={isLoading}
          currentHandle={data.targetUser.handle}
        />

        {/* View Content based on viewMode */}
        <div className="w-full max-w-6xl mx-auto flex-1">
          {settings.viewMode === 'orbit' && (
            <div className="space-y-2">
              <OrbitView
                data={data}
                settings={settings}
                onOpenExport={() => setIsExportModalOpen(true)}
              />
              <ControlPanel
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            </div>
          )}

          {settings.viewMode === 'tierlist' && <TierListView data={data} />}

          {settings.viewMode === 'insights' && <InsightsView data={data} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-8 px-4 mt-12 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">OpenXCircle</span>
            <span>·</span>
            <span>100% 纯前端开源应用 · 永久免费</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              零后端依赖 · 浏览器本地计算
            </span>
            <a
              href="https://github.com/xiuN1ng/OpenXCircle"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub 仓库
            </a>
          </div>
        </div>
      </footer>

      {/* Archive Modal */}
      <ArchiveDropzone
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onSuccess={(archiveData) => {
          setData(archiveData);
        }}
      />

      {/* Export Poster Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={data}
        settings={settings}
      />
    </div>
  );
}

export default App;
