"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AssetRow } from "@/lib/supabase/types";

type ApiResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

export function AssetsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/assets", { cache: "no-store" });
        const body = (await response.json()) as ApiResponse<AssetRow[]>;
        if (!response.ok || !body.ok) {
          throw new Error(body.message ?? "Unable to load assets");
        }
        setAssets(body.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load assets");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assets;

    return assets.filter(
      (asset) =>
        asset.asset_no.toLowerCase().includes(term) ||
        asset.asset_name.toLowerCase().includes(term) ||
        asset.current_status.toLowerCase().includes(term) ||
        asset.current_location.toLowerCase().includes(term),
    );
  }, [assets, search]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-sm overflow-x-hidden bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold">Assets</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search and view all assets</p>

        <div className="mt-4">
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset no, name, status, location"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading assets...</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filtered.map((asset) => (
              <li key={asset.id}>
                <Link
                  href={`/assets/${encodeURIComponent(asset.asset_no)}`}
                  className="block rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Info label="Asset No" value={asset.asset_no} />
                    <Info label="Repair Count" value={String(asset.repair_count)} />
                    <Info label="Asset Name" value={asset.asset_name} full />
                    <Info label="Current Status" value={asset.current_status} />
                    <Info label="Current Location" value={asset.current_location} full />
                  </div>
                </Link>
              </li>
            ))}

            {filtered.length === 0 && (
              <li className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No assets found.
              </li>
            )}
          </ul>
        )}
      </section>
    </main>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : "col-span-1"}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  );
}
