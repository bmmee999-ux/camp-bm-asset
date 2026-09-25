"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type DashboardData = {
  cards: {
    assetsTotal: number;
    borrowedAssets: number;
    returnedAssets: number;
    assetsUnderRepair: number;
    overdueAssets: number;
    recentlyMovedAssets: number;
  };
  charts: {
    monthlyBorrow: Array<{ label: string; value: number }>;
    monthlyReturn: Array<{ label: string; value: number }>;
    mostRepairedAssets: Array<{ assetNo: string; assetName: string; repairCount: number }>;
    recentActivities: Array<{
      id: string;
      type: "TRANSACTION" | "MOVE";
      title: string;
      description: string;
      date: string;
    }>;
  };
};

type ApiResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const body = (await response.json()) as ApiResponse<DashboardData>;
        if (!response.ok || !body.ok || !body.data) {
          throw new Error(body.message ?? "Unable to load dashboard");
        }
        setData(body.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxBorrow = useMemo(
    () => Math.max(1, ...(data?.charts.monthlyBorrow.map((x) => x.value) ?? [0])),
    [data],
  );

  const maxReturn = useMemo(
    () => Math.max(1, ...(data?.charts.monthlyReturn.map((x) => x.value) ?? [0])),
    [data],
  );

  const maxRepair = useMemo(
    () => Math.max(1, ...(data?.charts.mostRepairedAssets.map((x) => x.repairCount) ?? [0])),
    [data],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl overflow-x-hidden bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:px-6">
      <header className="mb-5">
        <h1 className="text-xl font-bold md:text-2xl">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Asset management overview and analytics</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</p>
      ) : data ? (
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <CardStat label="Assets Total" value={data.cards.assetsTotal} />
            <CardStat label="Borrowed Assets" value={data.cards.borrowedAssets} />
            <CardStat label="Returned Assets" value={data.cards.returnedAssets} />
            <CardStat label="Assets Under Repair" value={data.cards.assetsUnderRepair} />
            <CardStat label="Overdue Assets" value={data.cards.overdueAssets} />
            <CardStat label="Recently Moved Assets" value={data.cards.recentlyMovedAssets} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <ChartCard title="Monthly Borrow">
              <BarChart points={data.charts.monthlyBorrow} max={maxBorrow} color="bg-blue-500" />
            </ChartCard>

            <ChartCard title="Monthly Return">
              <BarChart points={data.charts.monthlyReturn} max={maxReturn} color="bg-emerald-500" />
            </ChartCard>

            <ChartCard title="Most Repaired Assets">
              <ul className="space-y-2">
                {data.charts.mostRepairedAssets.length === 0 ? (
                  <li className="text-sm text-slate-500 dark:text-slate-400">No repair records yet.</li>
                ) : (
                  data.charts.mostRepairedAssets.map((item) => (
                    <li key={item.assetNo} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium">{item.assetNo}</span>
                        <span>{item.repairCount}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-2 rounded bg-amber-500"
                          style={{ width: `${(item.repairCount / maxRepair) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{item.assetName}</p>
                    </li>
                  ))
                )}
              </ul>
            </ChartCard>

            <ChartCard title="Recent Activities">
              <ul className="space-y-2">
                {data.charts.recentActivities.length === 0 ? (
                  <li className="text-sm text-slate-500 dark:text-slate-400">No activities.</li>
                ) : (
                  data.charts.recentActivities.map((act) => (
                    <li key={act.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{act.title}</p>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{act.type}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{act.description}</p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(act.date).toLocaleString()}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </ChartCard>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function CardStat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </article>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </article>
  );
}

function BarChart({
  points,
  max,
  color,
}: {
  points: Array<{ label: string; value: number }>;
  max: number;
  color: string;
}) {
  return (
    <ul className="space-y-2">
      {points.map((p) => (
        <li key={p.label} className="text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">{p.label}</span>
            <span className="font-medium">{p.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
            <div className={`h-2 rounded ${color}`} style={{ width: `${(p.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
