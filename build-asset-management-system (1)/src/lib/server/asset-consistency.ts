import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function updateAssetOnTransaction(
  supabase: SupabaseClient<Database>,
  params: {
    assetNo: string;
    assetName?: string;
    sapNo?: string;
    increaseRepairCount?: boolean;
  },
) {
  const { assetNo, assetName, sapNo, increaseRepairCount } = params;

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("asset_no, repair_count")
    .eq("asset_no", assetNo)
    .maybeSingle();

  if (assetError) {
    throw new Error(assetError.message);
  }

  if (!asset) {
    return;
  }

  const payload: {
    asset_name?: string;
    sap_no?: string | null;
    repair_count?: number;
  } = {};

  if (assetName && assetName.trim()) {
    payload.asset_name = assetName.trim();
  }

  if (sapNo !== undefined) {
    payload.sap_no = sapNo.trim() ? sapNo.trim() : null;
  }

  if (increaseRepairCount) {
    payload.repair_count = (asset.repair_count ?? 0) + 1;
  }

  if (Object.keys(payload).length === 0) return;

  const { error: updateError } = await supabase.from("assets").update(payload).eq("asset_no", assetNo);

  if (updateError) {
    throw new Error(updateError.message);
  }
}
