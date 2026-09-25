"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AssetRow, FileRow, TransactionRow, TransactionType } from "@/lib/supabase/types";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [assetResponse, timelineResponse] = await Promise.all([
          fetch(`/api/assets?assetNo=${encodeURIComponent(assetNo)}`, { cache: "no-store" }),
          fetch(`/api/assets/${encodeURIComponent(assetNo)}/timeline`, { cache: "no-store" }),
        ]);

        const assetBody = (await assetResponse.json()) as ApiResponse<AssetRow[]>;
        const timelineBody = (await timelineResponse.json()) as ApiResponse<TimelineItem[]>;

        if (!assetResponse.ok || !assetBody.ok) {
          throw new Error(assetBody.message ?? "Unable to load asset detail");
        }

        if (!timelineResponse.ok || !timelineBody.ok) {
          throw new Error(timelineBody.message ?? "Unable to load timeline");
        }

        const found = (assetBody.data ?? [])[0] ?? null;
        if (!found) {
          throw new Error("Asset not found");
        }

        setAsset(found);
        setTimeline(timelineBody.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load asset detail");
      } finally {
        setLoading(false);
      }
    })();
  }, [assetNo]);

  const timelineCount = useMemo(() => timeline.length, [timeline]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-sm overflow-x-hidden bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="space-y-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Link href="/assets" className="text-sm text-blue-700 underline dark:text-blue-300">
            ← Back to Assets
          </Link>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading asset detail...</p>
          ) : error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
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

        {!loading && !error && (
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Timeline ({timelineCount})</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Newest first</p>

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
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(transaction.transaction_date).toLocaleString()}
                        </span>
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
