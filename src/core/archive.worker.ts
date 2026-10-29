import { parseTwitterArchive } from './archiveParser';

interface ArchiveWorkerScope {
  onmessage: ((event: MessageEvent<{ file: File }>) => void) | null;
  postMessage: (message: unknown) => void;
}

const scope = self as unknown as ArchiveWorkerScope;

scope.onmessage = async (event: MessageEvent<{ file: File }>) => {
  try {
    const data = await parseTwitterArchive(event.data.file);
    scope.postMessage({ ok: true, data });
  } catch (err) {
    scope.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : '解析失败',
    });
  }
};

