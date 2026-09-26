import { badRequest, internalError, requireSupabase } from "@/lib/api";
import type { AssetImageInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const BUCKET_NAME = "asset-images";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 10;

function extOf(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function isAllowedImage(file: File) {
  const ext = extOf(file.name);
  return (
    file.type === "image/jpeg" ||
    file.type === "image/jpg" ||
    file.type === "image/png" ||
    file.type === "image/heic" ||
    file.type === "image/heif" ||
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
  const assetNo = searchParams.get("assetNo")?.trim();

  const query = supabase.from("asset_images").select("*").order("created_at", { ascending: false });
  const { data, error } = assetNo ? await query.eq("asset_no", assetNo) : await query.limit(500);

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
  const assetNo = String(formData.get("assetNo") ?? "").trim();

  if (!assetNo) {
    return badRequest("assetNo is required");
  }

  const fileEntries = formData.getAll("images");
  const files = fileEntries.filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return badRequest("at least one image is required");
  }

  if (files.length > MAX_FILES) {
    return badRequest(`maximum ${MAX_FILES} images per upload`);
  }

  const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
  if (oversized) {
    return badRequest("one or more files exceed 20MB");
  }

  for (const file of files) {
    if (!isAllowedImage(file)) {
      return badRequest("only JPG, PNG, and HEIC files are allowed");
    }
  }

  const inserts: AssetImageInsert[] = [];

  for (const file of files) {
    const filePath = `${assetNo}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      return internalError(uploadError.message);
    }

    const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    inserts.push({
      asset_no: assetNo,
      file_url: publicData.publicUrl,
      file_type: file.type || extOf(file.name) || "unknown",
    });
  }

  const { data: rows, error: insertError } = await supabase.from("asset_images").insert(inserts).select("*");

  if (insertError) {
    return internalError(insertError.message);
  }

  return Response.json({ ok: true, data: rows }, { status: 201 });
}
