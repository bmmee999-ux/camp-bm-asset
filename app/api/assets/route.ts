import { badRequest, internalError, requireSupabase } from "@/lib/api";
import type { AssetInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const { searchParams } = new URL(request.url);
  const assetNo = searchParams.get("assetNo")?.trim();

  const query = supabase.from("assets").select("*").order("created_at", { ascending: false });

  const { data, error } = assetNo ? await query.eq("asset_no", assetNo) : await query;

  if (error) {
    return internalError(error.message);
  }

  return Response.json({ ok: true, data });
}

export async function POST(request: Request) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const body = (await request.json()) as Partial<AssetInsert>;

  if (!body.asset_no || !body.asset_name) {
    return badRequest("asset_no and asset_name are required");
  }

  const payload: AssetInsert = {
    asset_no: body.asset_no,
    asset_name: body.asset_name,
    sap_no: body.sap_no ?? null,
    current_status: body.current_status ?? "AVAILABLE",
    current_location: body.current_location ?? "UNKNOWN",
    repair_count: body.repair_count ?? 0,
  };

  const { data, error } = await supabase.from("assets").insert(payload).select("*").single();

  if (error) {
    return internalError(error.message);
  }

  return Response.json({ ok: true, data }, { status: 201 });
}
