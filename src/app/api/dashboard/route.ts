import { internalError, requireSupabase } from "@/lib/api";
import type { AssetRow, LocationRow, TransactionRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type MonthlyPoint = { label: string; value: number };

type ActivityItem = {
  id: string;
  type: "TRANSACTION" | "MOVE";
  title: string;
  description: string;
  date: string;
};

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function monthKey(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${m}`;
}

function getLastMonths(count: number) {
  const now = new Date();
  const months: Array<{ key: string; label: string }> = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: monthLabel(d) });
  }

  return months;
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export async function GET() {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const [assetsRes, transactionsRes, locationsRes] = await Promise.all([
    supabase
      .from("assets")
      .select("asset_no, asset_name, repair_count, current_status, current_location, created_at"),
    supabase
      .from("transactions")
      .select(
        "id, asset_no, transaction_type, ckl_no, employee_name, employee_id, transaction_date, remark, created_at",
      )
      .order("transaction_date", { ascending: false }),
    supabase
      .from("locations")
      .select("id, asset_no, old_location, new_location, latitude, longitude, move_date")
      .order("move_date", { ascending: false }),
  ]);

  if (assetsRes.error) return internalError(assetsRes.error.message);
  if (transactionsRes.error) return internalError(transactionsRes.error.message);
  if (locationsRes.error) return internalError(locationsRes.error.message);

  const assets = (assetsRes.data ?? []) as AssetRow[];
  const transactions = (transactionsRes.data ?? []) as TransactionRow[];
  const locations = (locationsRes.data ?? []) as LocationRow[];

  const latestTxByAsset = new Map<string, TransactionRow>();
  for (const tx of transactions) {
    const existing = latestTxByAsset.get(tx.asset_no);
    if (!existing) {
      latestTxByAsset.set(tx.asset_no, tx);
      continue;
    }

    const txTime = Math.max(normalizeDate(tx.transaction_date), normalizeDate(tx.created_at));
    const oldTime = Math.max(normalizeDate(existing.transaction_date), normalizeDate(existing.created_at));
    if (txTime > oldTime) {
      latestTxByAsset.set(tx.asset_no, tx);
    }
  }

  let borrowedAssets = 0;
  let returnedAssets = 0;
  let assetsUnderRepair = 0;
  let overdueAssets = 0;

  const now = Date.now();
  const overdueDays = 30;

  for (const asset of assets) {
    const latest = latestTxByAsset.get(asset.asset_no);
    if (!latest) continue;

    if (latest.transaction_type === "BORROW") {
      borrowedAssets += 1;
      const borrowedAt = normalizeDate(latest.transaction_date || latest.created_at);
      const days = (now - borrowedAt) / (1000 * 60 * 60 * 24);
      if (days > overdueDays) overdueAssets += 1;
    }

    if (latest.transaction_type === "RETURN") {
      returnedAssets += 1;
    }

    if (latest.transaction_type === "REPAIR_SEND") {
      assetsUnderRepair += 1;
    }
  }

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentlyMovedAssets = new Set(
    locations
      .filter((loc) => normalizeDate(loc.move_date) >= sevenDaysAgo)
      .map((loc) => loc.asset_no),
  );

  const recentMonths = getLastMonths(6);

  const borrowByMonthMap = new Map(recentMonths.map((m) => [m.key, 0]));
  const returnByMonthMap = new Map(recentMonths.map((m) => [m.key, 0]));

  for (const tx of transactions) {
    const d = new Date(tx.transaction_date || tx.created_at);
    const key = monthKey(d);

    if (tx.transaction_type === "BORROW" && borrowByMonthMap.has(key)) {
      borrowByMonthMap.set(key, (borrowByMonthMap.get(key) ?? 0) + 1);
    }

    if (tx.transaction_type === "RETURN" && returnByMonthMap.has(key)) {
      returnByMonthMap.set(key, (returnByMonthMap.get(key) ?? 0) + 1);
    }
  }

  const monthlyBorrow: MonthlyPoint[] = recentMonths.map((m) => ({
    label: m.label,
    value: borrowByMonthMap.get(m.key) ?? 0,
  }));

  const monthlyReturn: MonthlyPoint[] = recentMonths.map((m) => ({
    label: m.label,
    value: returnByMonthMap.get(m.key) ?? 0,
  }));

  const mostRepairedAssets = [...assets]
    .filter((a) => (a.repair_count ?? 0) > 0)
    .sort((a, b) => (b.repair_count ?? 0) - (a.repair_count ?? 0))
    .slice(0, 8)
    .map((a) => ({
      assetNo: a.asset_no,
      assetName: a.asset_name,
      repairCount: a.repair_count ?? 0,
    }));

  const txActivities: ActivityItem[] = transactions.slice(0, 20).map((tx) => ({
    id: `tx-${tx.id}`,
    type: "TRANSACTION",
    title: `${tx.transaction_type} • ${tx.asset_no}`,
    description: `${tx.employee_name ?? "-"}${tx.remark ? ` • ${tx.remark}` : ""}`,
    date: tx.transaction_date || tx.created_at,
  }));

  const moveActivities: ActivityItem[] = locations.slice(0, 20).map((loc) => ({
    id: `mv-${loc.id}`,
    type: "MOVE",
    title: `MOVE • ${loc.asset_no}`,
    description: `${loc.old_location ?? "-"} → ${loc.new_location}`,
    date: loc.move_date,
  }));

  const recentActivities = [...txActivities, ...moveActivities]
    .sort((a, b) => normalizeDate(b.date) - normalizeDate(a.date))
    .slice(0, 20);

  return Response.json({
    ok: true,
    data: {
      cards: {
        assetsTotal: assets.length,
        borrowedAssets,
        returnedAssets,
        assetsUnderRepair,
        overdueAssets,
        recentlyMovedAssets: recentlyMovedAssets.size,
      },
      charts: {
        monthlyBorrow,
        monthlyReturn,
        mostRepairedAssets,
        recentActivities,
      },
    },
  });
}
