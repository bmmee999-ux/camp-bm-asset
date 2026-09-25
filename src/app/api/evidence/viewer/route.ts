import { badRequest, internalError, requireSupabase } from "@/lib/api";
import type { FileRow, TransactionRow, TransactionType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type EvidenceItem = {
  id: string;
  transactionId: string;
  assetNo: string;
  transactionType: TransactionType;
  fileUrl: string;
  fileType: string;
  date: string;
};

function isPdf(file: FileRow) {
  const type = file.file_type.toLowerCase();
  const url = file.file_url.toLowerCase();
  return type.includes("pdf") || url.endsWith(".pdf");
}

function isImage(file: FileRow) {
  const type = file.file_type.toLowerCase();
  const url = file.file_url.toLowerCase();
  return (
    type.includes("image") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".png") ||
    url.endsWith(".heic") ||
    url.endsWith(".heif")
  );
}

function toEvidenceItem(file: FileRow, tx: TransactionRow): EvidenceItem {
  return {
    id: file.id,
    transactionId: file.transaction_id,
    assetNo: tx.asset_no,
    transactionType: tx.transaction_type,
    fileUrl: file.file_url,
    fileType: file.file_type,
    date: tx.transaction_date || tx.created_at,
  };
}

export async function GET(request: Request) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const { searchParams } = new URL(request.url);
  const assetNo = searchParams.get("assetNo")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit") ?? "300");
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(1000, limitParam)) : 300;

  const txQuery = supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: txRows, error: txError } = assetNo
    ? await txQuery.eq("asset_no", assetNo)
    : await txQuery;

  if (txError) {
    return internalError(txError.message);
  }

  const transactions = (txRows ?? []) as TransactionRow[];
  const txIds = transactions.map((tx) => tx.id);

  if (txIds.length === 0) {
    return Response.json({
      ok: true,
      data: {
        pdfDocuments: [],
        uploadedPhotos: [],
        movePhotos: [],
        repairPhotos: [],
      },
    });
  }

  const { data: fileRows, error: filesError } = await supabase
    .from("files")
    .select("*")
    .in("transaction_id", txIds)
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (filesError) {
    return internalError(filesError.message);
  }

  const files = (fileRows ?? []) as FileRow[];

  const txMap = new Map(transactions.map((tx) => [tx.id, tx]));

  const pdfDocuments: EvidenceItem[] = [];
  const uploadedPhotos: EvidenceItem[] = [];
  const movePhotos: EvidenceItem[] = [];
  const repairPhotos: EvidenceItem[] = [];

  for (const file of files) {
    const tx = txMap.get(file.transaction_id);
    if (!tx) continue;

    if (isPdf(file)) {
      pdfDocuments.push(toEvidenceItem(file, tx));
      continue;
    }

    if (isImage(file)) {
      const item = toEvidenceItem(file, tx);
      uploadedPhotos.push(item);

      if (tx.transaction_type === "MOVE") {
        movePhotos.push(item);
      }

      if (tx.transaction_type === "REPAIR_SEND" || tx.transaction_type === "REPAIR_RECEIVE") {
        repairPhotos.push(item);
      }
    }
  }

  const sortNewest = (a: EvidenceItem, b: EvidenceItem) => new Date(b.date).getTime() - new Date(a.date).getTime();

  pdfDocuments.sort(sortNewest);
  uploadedPhotos.sort(sortNewest);
  movePhotos.sort(sortNewest);
  repairPhotos.sort(sortNewest);

  return Response.json({
    ok: true,
    data: {
      pdfDocuments,
      uploadedPhotos,
      movePhotos,
      repairPhotos,
    },
  });
}
