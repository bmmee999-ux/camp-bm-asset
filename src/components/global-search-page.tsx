"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SearchResult = {
  assetNo: string;
  assetName: string;
  sapNo: string | null;
  currentStatus: string;
  currentLocation: string;
  matchedBy: string[];
};

type ApiResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

export function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [normalizedQuery]);

  useEffect(() => {
    const controller = new AbortController();

    if (!debouncedQuery) {
      setResults([]);
      setError(null);
      setLoading(false);
      return () => controller.abort();
    }

    if (debouncedQuery.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const body = (await response.json()) as ApiResponse<SearchResult[]>;

        if (!response.ok || !body.ok) {
          throw new Error(body.message ?? "Unable to search");
        }

        setResults(body.data ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to search");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-sm overflow-x-hidden bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold">Global Search</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Search by Asset No, Asset Name, CKL Doc No, Employee Name, Employee ID, SAP No
        </p>

        <div className="mt-4">
          <input
            className="input"
            placeholder="Start typing to search instantly..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Searching...</p>}

        {!loading && normalizedQuery.length > 0 && normalizedQuery.length < 2 && !error && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Type at least 2 characters to search.</p>
        )}

        {!loading && normalizedQuery.length >= 2 && results.length === 0 && !error && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No matching assets found.</p>
        )}

        <ul className="mt-4 space-y-2">
          {results.map((item) => (
            <li key={item.assetNo}>
              <Link
                href={`/assets/${encodeURIComponent(item.assetNo)}`}
                className="block rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.assetNo}</p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{item.currentStatus}</span>
                </div>
                <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-200">{item.assetName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  SAP: {item.sapNo ?? "-"} • Location: {item.currentLocation}
                </p>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  Matched by: {item.matchedBy.length > 0 ? item.matchedBy.join(", ") : "-"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
