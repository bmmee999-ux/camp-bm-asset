import { internalError, requireSupabase } from "@/lib/api";
import type { AssetRow, TransactionRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type SearchResult = {
  assetNo: string;
  assetName: string;
  sapNo: string | null;
  currentStatus: string;
  currentLocation: string;
  matchedBy: string[];
};

function includesTerm(value: string | null | undefined, term: string) {
  return (value ?? "").toLowerCase().includes(term);
}

export async function GET(request: Request) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get("q") ?? "";
  const q = rawQ.trim();

  if (!q || q.length < 2) {
    return Response.json({ ok: true, data: [] });
  }

  const like = `%${q}%`;
  const lowerQ = q.toLowerCase();

  const [assetsRes, txRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, asset_no, asset_name, sap_no, current_status, current_location")
      .or(`asset_no.ilike.${like},asset_name.ilike.${like},sap_no.ilike.${like}`)
      .limit(50),
    supabase
      .from("transactions")
      .select("id, asset_no, ckl_no, employee_name, employee_id, transaction_date")
      .or(
        `asset_no.ilike.${like},ckl_no.ilike.${like},employee_name.ilike.${like},employee_id.ilike.${like}`,
      )
      .order("transaction_date", { ascending: false })
      .limit(100),
  ]);

  if (assetsRes.error) {
    return internalError(assetsRes.error.message);
  }

  if (txRes.error) {
    return internalError(txRes.error.message);
  }

  const directAssets = (assetsRes.data ?? []) as AssetRow[];
  const txMatches = (txRes.data ?? []) as TransactionRow[];

  const txAssetNos = [...new Set(txMatches.map((tx) => tx.asset_no))];
  let txAssets: AssetRow[] = [];

  if (txAssetNos.length > 0) {
    const { data: txAssetsData, error: txAssetsError } = await supabase
      .from("assets")
      .select("*")
      .in("asset_no", txAssetNos)
      .limit(100);

    if (txAssetsError) {
      return internalError(txAssetsError.message);
    }

    txAssets = (txAssetsData ?? []) as AssetRow[];
  }

  const byAssetNo = new Map<string, SearchResult>();

  const upsertAsset = (asset: AssetRow) => {
    const existing = byAssetNo.get(asset.asset_no);
    if (existing) return existing;

    const created: SearchResult = {
      assetNo: asset.asset_no,
      assetName: asset.asset_name,
      sapNo: asset.sap_no,
      currentStatus: asset.current_status,
      currentLocation: asset.current_location,
      matchedBy: [],
    };

    byAssetNo.set(asset.asset_no, created);
    return created;
  };

  for (const asset of directAssets) {
    const item = upsertAsset(asset);

    if (includesTerm(asset.asset_no, lowerQ)) item.matchedBy.push("Asset No");
    if (includesTerm(asset.asset_name, lowerQ)) item.matchedBy.push("Asset Name");
    if (includesTerm(asset.sap_no, lowerQ)) item.matchedBy.push("SAP No");
  }

  const txAssetMap = new Map(txAssets.map((a) => [a.asset_no, a]));

  for (const tx of txMatches) {
    const asset = txAssetMap.get(tx.asset_no);
    if (!asset) continue;

    const item = upsertAsset(asset);

    if (includesTerm(tx.asset_no, lowerQ)) item.matchedBy.push("Asset No");
    if (includesTerm(tx.ckl_no, lowerQ)) item.matchedBy.push("CKL Doc No");
    if (includesTerm(tx.employee_name, lowerQ)) item.matchedBy.push("Employee Name");
    if (includesTerm(tx.employee_id, lowerQ)) item.matchedBy.push("Employee ID");
  }

  const results = [...byAssetNo.values()]
    .map((item) => ({ ...item, matchedBy: [...new Set(item.matchedBy)] }))
    .sort((a, b) => a.assetNo.localeCompare(b.assetNo))
    .slice(0, 100);

  return Response.json({ ok: true, data: results });
}
