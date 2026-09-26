import { badRequest, internalError, requireSupabase } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const { id } = await params;
  const transactionId = id?.trim();

  if (!transactionId) {
    return badRequest("transaction id is required");
  }

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("id, asset_no, transaction_type")
    .eq("id", transactionId)
    .maybeSingle();

  if (txError) {
    return internalError(txError.message);
  }

  if (!transaction) {
    return badRequest("transaction not found");
  }

  if (transaction.transaction_type === "REPAIR_SEND") {
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("repair_count")
      .eq("asset_no", transaction.asset_no)
      .maybeSingle();

    if (assetError) {
      return internalError(assetError.message);
    }

    if (asset) {
      const nextRepairCount = Math.max(0, (asset.repair_count ?? 0) - 1);
      const { error: updateErr } = await supabase
        .from("assets")
        .update({ repair_count: nextRepairCount })
        .eq("asset_no", transaction.asset_no);

      if (updateErr) {
        return internalError(updateErr.message);
      }
    }
  }

  const { error: deleteError } = await supabase.from("transactions").delete().eq("id", transactionId);

  if (deleteError) {
    return internalError(deleteError.message);
  }

  return Response.json({ ok: true });
}
