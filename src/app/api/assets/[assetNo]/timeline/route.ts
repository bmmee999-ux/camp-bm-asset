import { internalError, requireSupabase } from "@/lib/api";
import type { FileRow, TransactionRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type TimelineItem = {
  transaction: TransactionRow;
  files: FileRow[];
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetNo: string }> },
) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const { assetNo: rawAssetNo } = await params;
  const assetNo = decodeURIComponent(rawAssetNo);

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("asset_no", assetNo)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (txError) {
    return internalError(txError.message);
  }

  const txIds = (transactions ?? []).map((tx) => tx.id);

  let files: FileRow[] = [];
  if (txIds.length > 0) {
    const { data: fileRows, error: fileError } = await supabase
      .from("files")
      .select("*")
      .in("transaction_id", txIds)
      .order("created_at", { ascending: false });

    if (fileError) {
      return internalError(fileError.message);
    }

    files = fileRows ?? [];
  }

  const filesByTransaction = new Map<string, FileRow[]>();
  for (const file of files) {
    const arr = filesByTransaction.get(file.transaction_id) ?? [];
    arr.push(file);
    filesByTransaction.set(file.transaction_id, arr);
  }

  const timeline: TimelineItem[] = (transactions ?? []).map((transaction) => ({
    transaction,
    files: filesByTransaction.get(transaction.id) ?? [],
  }));

  return Response.json({ ok: true, data: timeline });
}
