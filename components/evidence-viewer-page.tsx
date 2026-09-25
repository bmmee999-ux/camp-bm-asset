"use client";

import { useEffect, useState } from "react";
import type { TransactionType } from "@/lib/supabase/types";

type EvidenceItem = {
  id: string;
  transactionId: string;
  assetNo: string;
  transactionType: TransactionType;
  fileUrl: string;
  fileType: string;
  date: string;
};

type ViewerData = {
  pdfDocuments: EvidenceItem[];
  uploadedPhotos: EvidenceItem[];
  movePhotos: EvidenceItem[];
  repairPhotos: EvidenceItem[];
};

type ApiResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

export function EvidenceViewerPage() {
  const [assetNo, setAssetNo] = useState("");
  const [data, setData] = useState<ViewerData>({
    pdfDocuments: [],
    uploadedPhotos: [],
    movePhotos: [],
    repairPhotos: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function loadEvidence(asset?: string) {
    setLoading(true);
    setError(null);

    try {
      const query = asset?.trim() ? `?assetNo=${encodeURIComponent(asset.trim())}` : "";
      const response = await fetch(`/api/evidence/viewer${query}`, { cache: "no-store" });
      const body = (await response.json()) as ApiResponse<ViewerData>;

      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.message ?? "Unable to load evidence");
      }

      setData(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load evidence");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvidence();
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl overflow-x-hidden bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:px-6">
      <header className="mb-5">
        <h1 className="text-xl font-bold md:text-2xl">Evidence Viewer</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          View PDF documents and uploaded photos (including move and repair evidence)
        </p>
      </header>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="input"
            placeholder="Filter by Asset No"
            value={assetNo}
            onChange={(e) => setAssetNo(e.target.value)}
          />
          <button
            onClick={() => void loadEvidence(assetNo)}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Search
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading evidence...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">PDF Documents ({data.pdfDocuments.length})</h2>
            <FileList items={data.pdfDocuments} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">Uploaded Photos ({data.uploadedPhotos.length})</h2>
            <PhotoGrid items={data.uploadedPhotos} onPreview={setPreviewUrl} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">Move Photos ({data.movePhotos.length})</h2>
            <PhotoGrid items={data.movePhotos} onPreview={setPreviewUrl} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">Repair Photos ({data.repairPhotos.length})</h2>
            <PhotoGrid items={data.repairPhotos} onPreview={setPreviewUrl} />
          </section>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="preview" className="max-h-[80vh] w-full rounded-xl object-contain" />
            <button
              className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900"
              onClick={() => setPreviewUrl(null)}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function FileList({ items }: { items: EvidenceItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No PDF documents.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700">
          <p className="font-medium">{item.assetNo}</p>
          <p className="text-slate-500 dark:text-slate-400">{item.transactionType}</p>
          <p className="text-slate-500 dark:text-slate-400">{new Date(item.date).toLocaleString()}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={item.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-blue-600 px-2 py-1 text-white"
            >
              Open PDF
            </a>
            <a href={item.fileUrl} download className="rounded bg-slate-700 px-2 py-1 text-white">
              Download
            </a>

          </div>
        </li>
      ))}
    </ul>
  );
}

function PhotoGrid({
  items,
  onPreview,
}: {
  items: EvidenceItem[];
  onPreview: (url: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No photos.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <button className="w-full" onClick={() => onPreview(item.fileUrl)}>
            <img src={item.fileUrl} alt={item.assetNo} className="h-28 w-full object-cover" />
          </button>
          <div className="space-y-1 p-2 text-[11px]">
            <p className="font-medium">{item.assetNo}</p>
            <p className="text-slate-500 dark:text-slate-400">{item.transactionType}</p>
            <p className="text-slate-500 dark:text-slate-400">{new Date(item.date).toLocaleDateString()}</p>
            <div className="flex flex-wrap gap-1">
              <a
                href={item.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-blue-600 px-2 py-1 text-white"
              >
                Open
              </a>
              <a href={item.fileUrl} download className="rounded bg-slate-700 px-2 py-1 text-white">
                Download
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
