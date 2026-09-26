"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  AssetImageRow,
  AssetRow,
  FileRow,
  TransactionRow,
  TransactionType,
} from "@/lib/supabase/types";

type ApiResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

type TimelineItem = {
  transaction: TransactionRow;
  files: FileRow[];
};

const transactionLabels: Record<TransactionType, string> = {
  BORROW: "Borrow",
  RETURN: "Return",
  REPAIR_SEND: "Repair Send",
  REPAIR_RECEIVE: "Repair Receive",
  MOVE: "Move",
};

export function AssetDetailPage({ assetNo }: { assetNo: string }) {
  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [assetImages, setAssetImages] = useState<AssetImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [assetImageFiles, setAssetImageFiles] = useState<File[]>([]);
  const [uploadTargetTxId, setUploadTargetTxId] = useState("");
  const [extraEvidenceFiles, setExtraEvidenceFiles] = useState<File[]>([]);

  const [busy, setBusy] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [assetResponse, timelineResponse, imageResponse] = await Promise.all([
        fetch(`/api/assets?assetNo=${encodeURIComponent(assetNo)}`, { cache: "no-store" }),
        fetch(`/api/assets/${encodeURIComponent(assetNo)}/timeline`, { cache: "no-store" }),
        fetch(`/api/asset-images?assetNo=${encodeURIComponent(assetNo)}`, { cache: "no-store" }),
      ]);

      const assetBody = (await assetResponse.json()) as ApiResponse<AssetRow[]>;
      const timelineBody = (await timelineResponse.json()) as ApiResponse<TimelineItem[]>;
      const imageBody = (await imageResponse.json()) as ApiResponse<AssetImageRow[]>;

      if (!assetResponse.ok || !assetBody.ok) {
        throw new Error(assetBody.message ?? "Unable to load asset detail");
      }

      if (!timelineResponse.ok || !timelineBody.ok) {
        throw new Error(timelineBody.message ?? "Unable to load timeline");
      }

      if (!imageResponse.ok || !imageBody.ok) {
        throw new Error(imageBody.message ?? "Unable to load asset images");
      }

      const found = (assetBody.data ?? [])[0] ?? null;
      if (!found) {
        throw new Error("Asset not found");
      }

      const loadedTimeline = timelineBody.data ?? [];
      setAsset(found);
      setTimeline(loadedTimeline);
      setAssetImages(imageBody.data ?? []);
      setUploadTargetTxId((prev) => prev || loadedTimeline[0]?.transaction.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load asset detail");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [assetNo]);

  const timelineCount = useMemo(() => timeline.length, [timeline]);

  async function onUploadAssetImages() {
    setMessage(null);
    setError(null);

    if (assetImageFiles.length === 0) {
      setError("Please select one or more asset photos");
      return;
    }

    setBusy(true);

    try {
      const fd = new FormData();
      fd.append("assetNo", assetNo);
      assetImageFiles.forEach((file) => fd.append("images", file));

      const response = await fetch("/api/asset-images", {
        method: "POST",
        body: fd,
      });
      const body = (await response.json()) as ApiResponse<AssetImageRow[]>;

      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? "Unable to upload asset photos");
      }

      setMessage("Asset photos uploaded");
      setAssetImageFiles([]);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload asset photos");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteAssetImage(imageId: string) {
    setMessage(null);
    setError(null);
    setBusy(true);

    try {
      const response = await fetch(`/api/asset-images/${imageId}`, { method: "DELETE" });
      const body = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? "Unable to delete image");
      }
      setMessage("Asset photo deleted");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete image");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadTimelineEvidence() {
    setMessage(null);
    setError(null);

    if (!uploadTargetTxId) {
      setError("Please select a transaction");
      return;
    }

    if (extraEvidenceFiles.length === 0) {
      setError("Please select evidence files (PDF or photos)");
      return;
    }

    setBusy(true);

    try {
      const fd = new FormData();
      fd.append("transactionId", uploadTargetTxId);

      let pdfAttached = false;
      for (const file of extraEvidenceFiles) {
        const lower = file.name.toLowerCase();
        const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");

        if (isPdf && !pdfAttached) {
          fd.append("pdf", file);
          pdfAttached = true;
        } else {
          fd.append("photos", file);
        }
      }

      const response = await fetch("/api/evidence", {
        method: "POST",
        body: fd,
      });
      const body = (await response.json()) as ApiResponse<FileRow[]>;

      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? "Unable to upload evidence");
      }

      setMessage("Evidence uploaded to selected timeline item");
      setExtraEvidenceFiles([]);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload evidence");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteTransaction(txId: string) {
    const confirmed = window.confirm("Delete this transaction and related evidence files?");
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    setBusy(true);

    try {
      const response = await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
      const body = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? "Unable to delete transaction");
      }
      setMessage("Transaction deleted");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete transaction");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-sm overflow-x-hidden bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="space-y-4">
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Link href="/assets" className="text-sm text-blue-700 underline dark:text-blue-300">
            ← Back to Assets
          </Link>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading asset detail...</p>
          ) : asset ? (
            <div className="mt-4 space-y-3">
              <h1 className="text-lg font-semibold">Asset Detail</h1>
              <DetailRow label="Asset No" value={asset.asset_no} />
              <DetailRow label="Asset Name" value={asset.asset_name} />
              <DetailRow label="SAP No" value={asset.sap_no ?? "-"} />
              <DetailRow label="Current Status" value={asset.current_status} />
              <DetailRow label="Current Location" value={asset.current_location} />
              <DetailRow label="Repair Count" value={String(asset.repair_count)} />
            </div>
          ) : null}
        </article>

        {!loading && asset && (
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Asset Photos ({assetImages.length})</h2>

            <div className="mt-3 space-y-2">
              <input
                className="input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
                multiple
                onChange={(e) => setAssetImageFiles(Array.from(e.target.files ?? []))}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void onUploadAssetImages()}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
              >
                Upload Asset Photos
              </button>
            </div>

            {assetImages.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {assetImages.map((image) => (
                  <div key={image.id} className="rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                    <img src={image.file_url} alt={image.asset_no} className="h-20 w-full rounded object-cover" />
                    <button
                      type="button"
                      onClick={() => void onDeleteAssetImage(image.id)}
                      className="mt-1 w-full rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {!loading && !error && (
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Timeline ({timelineCount})</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Newest first</p>

            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <h3 className="text-sm font-semibold">Attach More Evidence (PDF / Photos)</h3>
              <select
                className="input"
                value={uploadTargetTxId}
                onChange={(e) => setUploadTargetTxId(e.target.value)}
              >
                <option value="">Select timeline item</option>
                {timeline.map((item) => (
                  <option key={item.transaction.id} value={item.transaction.id}>
                    {transactionLabels[item.transaction.transaction_type]} • {new Date(
                      item.transaction.transaction_date,
                    ).toLocaleString()}
                  </option>
                ))}
              </select>
              <input
                className="input"
                type="file"
                multiple
                accept="application/pdf,.pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
                onChange={(e) => setExtraEvidenceFiles(Array.from(e.target.files ?? []))}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void onUploadTimelineEvidence()}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
              >
                Upload to Timeline
              </button>
            </div>

            {timeline.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No transactions yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {timeline.map((item) => {
                  const { transaction, files } = item;

                  const photos = files.filter((file) => {
                    const lowerType = file.file_type.toLowerCase();
                    const lowerUrl = file.file_url.toLowerCase();
                    return (
                      lowerType.includes("image") ||
                      lowerUrl.endsWith(".jpg") ||
                      lowerUrl.endsWith(".jpeg") ||
                      lowerUrl.endsWith(".png") ||
                      lowerUrl.endsWith(".heic") ||
                      lowerUrl.endsWith(".heif")
                    );
                  });

                  const nonPhotoFiles = files.filter((file) => !photos.includes(file));

                  return (
                    <li key={transaction.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{transactionLabels[transaction.transaction_type]}</p>
                        <button
                          type="button"
                          onClick={() => void onDeleteTransaction(transaction.id)}
                          className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <span className="text-slate-500 dark:text-slate-400">date:</span>{" "}
                          {new Date(transaction.transaction_date).toLocaleString()}
                        </p>
                        <p>
                          <span className="text-slate-500 dark:text-slate-400">employee:</span>{" "}
                          {transaction.employee_name ?? "-"}
                          {transaction.employee_id ? ` (${transaction.employee_id})` : ""}
                        </p>
                        <p className="break-words">
                          <span className="text-slate-500 dark:text-slate-400">remark:</span>{" "}
                          {transaction.remark ?? "-"}
                        </p>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">files</p>
                        {nonPhotoFiles.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">-</p>
                        ) : (
                          <ul className="mt-1 space-y-1">
                            {nonPhotoFiles.map((file) => (
                              <li key={file.id}>
                                <a
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-blue-700 underline dark:text-blue-300"
                                >
                                  {file.file_type}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="mt-3">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">photos</p>
                        {photos.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">-</p>
                        ) : (
                          <div className="mt-1 grid grid-cols-3 gap-2">
                            {photos.map((photo) => (
                              <a
                                key={photo.id}
                                href={photo.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                <img
                                  src={photo.file_url}
                                  alt="transaction photo"
                                  className="h-20 w-full rounded-md border border-slate-200 object-cover dark:border-slate-700"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        )}
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  );
}
