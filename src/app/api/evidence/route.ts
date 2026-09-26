import { badRequest, internalError, requireSupabase } from "@/lib/api";
import type { FileInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const BUCKET_NAME = "transaction-evidence";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_PHOTO_FILES = 10;

const allowedPdfMimes = new Set(["application/pdf"]);
const allowedImageMimes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
]);

function extOf(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function isPdf(file: File) {
  const ext = extOf(file.name);
  return allowedPdfMimes.has(file.type) || ext === "pdf";
}

function isAllowedImage(file: File) {
  const ext = extOf(file.name);
  return (
    allowedImageMimes.has(file.type) ||
    ext === "jpg" ||
    ext === "jpeg" ||
    ext === "png" ||
    ext === "heic" ||
    ext === "heif"
  );
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureBucket() {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement;

  const { supabase } = requirement;
  const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: "20MB",
  });

  if (error && !error.message.toLowerCase().includes("already")) {
    return {
      ok: false as const,
      response: internalError(error.message),
    };
  }

  return { ok: true as const, supabase };
}

export async function GET(request: Request) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("transactionId")?.trim();

  if (!transactionId) {
    return badRequest("transactionId is required");
  }

  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: false });

  if (error) {
    return internalError(error.message);
  }

  return Response.json({ ok: true, data });
}

export async function POST(request: Request) {
  const bucketRequirement = await ensureBucket();
  if (!bucketRequirement.ok) return bucketRequirement.response;
  const { supabase } = bucketRequirement;

  const formData = await request.formData();

  const transactionId = String(formData.get("transactionId") ?? "").trim();
  if (!transactionId) {
    return badRequest("transactionId is required");
  }

  const maybePdf = formData.get("pdf");
  const photoEntries = formData.getAll("photos");

  const pdfFile = maybePdf instanceof File && maybePdf.size > 0 ? maybePdf : null;
  const photos = photoEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!pdfFile && photos.length === 0) {
    return badRequest("At least one file is required");
  }

  if (pdfFile && !isPdf(pdfFile)) {
    return badRequest("PDF evidence must be a PDF file");
  }

  if (photos.length > MAX_PHOTO_FILES) {
    return badRequest(`Maximum ${MAX_PHOTO_FILES} photos per upload`);
  }

  for (const photo of photos) {
    if (!isAllowedImage(photo)) {
      return badRequest("Only JPG, PNG, and HEIC images are allowed for photos");
    }
  }

  const uploadFiles: File[] = [];
  if (pdfFile) uploadFiles.push(pdfFile);
  uploadFiles.push(...photos);

  const oversized = uploadFiles.find((file) => file.size > MAX_FILE_SIZE);
  if (oversized) {
    return badRequest("One or more files exceed 20MB limit");
  }

  const inserts: FileInsert[] = [];

  for (const file of uploadFiles) {
    const filePath = `${transactionId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return internalError(uploadError.message);
    }

    const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    inserts.push({
      transaction_id: transactionId,
      file_url: publicData.publicUrl,
      file_type: file.type || extOf(file.name) || "unknown",
    });
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from("files")
    .insert(inserts)
    .select("*");

  if (insertError) {
    return internalError(insertError.message);
  }

  return Response.json({ ok: true, data: insertedRows }, { status: 201 });
}
