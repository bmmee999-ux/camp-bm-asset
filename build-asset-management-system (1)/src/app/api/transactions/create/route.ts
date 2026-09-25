import { ZodError } from "zod";
import { badRequest, internalError, requireSupabase } from "@/lib/api";
import { updateAssetOnTransaction } from "@/lib/server/asset-consistency";
import { createTransactionSchema } from "@/lib/validation";
import type { TransactionInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  try {
    const raw = (await request.json()) as unknown;
    const body = createTransactionSchema.parse(raw);

    const payload: TransactionInsert = {
      asset_no: body.asset_no,
      transaction_type: body.transaction_type,
      ckl_no: body.ckl_no?.trim() ? body.ckl_no.trim() : null,
      employee_name: body.employee_name?.trim() ? body.employee_name.trim() : null,
      employee_id: body.employee_id?.trim() ? body.employee_id.trim() : null,
      transaction_date: body.transaction_date ?? new Date().toISOString(),
      remark: body.remark?.trim() ? body.remark.trim() : null,
    };

    const { data: inserted, error } = await supabase
      .from("transactions")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return internalError(error.message);
    }

    await updateAssetOnTransaction(supabase, {
      assetNo: body.asset_no,
      assetName: body.asset_name,
      sapNo: body.sap_no,
      increaseRepairCount: body.transaction_type === "REPAIR_SEND",
    });

    return Response.json({ ok: true, data: inserted });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid request payload");
    }

    return internalError(error instanceof Error ? error.message : "Unable to create transaction");
  }
}
