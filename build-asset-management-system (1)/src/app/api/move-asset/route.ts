import { ZodError } from "zod";
import { badRequest, internalError, requireSupabase } from "@/lib/api";
import { moveAssetSchema } from "@/lib/validation";
import type { FileInsert, LocationInsert, TransactionInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const BUCKET_NAME = "transaction-evidence";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

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

function isAllowedFile(file: File) {
  const ext = extOf(file.name);
  return (
    file.type === "application/pdf" ||
    allowedImageMimes.has(file.type) ||
    ext === "pdf" ||
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

export async function POST(request: Request) {
  const bucketRequirement = await ensureBucket();
  if (!bucketRequirement.ok) return bucketRequirement.response;

  const { supabase } = bucketRequirement;

  try {
    const formData = await request.formData();

    const latRaw = String(formData.get("latitude") ?? "").trim();
    const lngRaw = String(formData.get("longitude") ?? "").trim();

    const latitude = latRaw ? Number(latRaw) : null;
    const longitude = lngRaw ? Number(lngRaw) : null;

    const body = moveAssetSchema.parse({
      asset_no: String(formData.get("asset_no") ?? ""),
      current_location: String(formData.get("current_location") ?? ""),
      new_location: String(formData.get("new_location") ?? ""),
      move_date: String(formData.get("move_date") ?? "") || undefined,
      remark: String(formData.get("remark") ?? ""),
      gps_location: String(formData.get("gps_location") ?? ""),
      latitude,
      longitude,
    });

    const { data: asset, error: assetErr } = await supabase
      .from("assets")
      .select("asset_no, current_location")
      .eq("asset_no", body.asset_no)
      .maybeSingle();

    if (assetErr) {
      return internalError(assetErr.message);
    }

    if (!asset) {
      return badRequest("Asset not found");
    }

    const oldLocation = body.current_location || asset.current_location;

    const locationPayload: LocationInsert = {
      asset_no: body.asset_no,
      old_location: oldLocation || null,
      new_location: body.new_location,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      move_date: body.move_date || new Date().toISOString(),
    };

    const { data: insertedLocation, error: locationError } = await supabase
      .from("locations")
      .insert(locationPayload)
      .select("*")
      .single();

    if (locationError) {
      return internalError(locationError.message);
    }

    const { error: updateError } = await supabase
      .from("assets")
      .update({ current_location: body.new_location })
      .eq("asset_no", body.asset_no);

    if (updateError) {
      return internalError(updateError.message);
    }

    const remarkParts = [body.remark?.trim(), body.gps_location?.trim() ? `GPS: ${body.gps_location.trim()}` : ""].filter(Boolean);

    const transactionPayload: TransactionInsert = {
      asset_no: body.asset_no,
      transaction_type: "MOVE",
      transaction_date: body.move_date || new Date().toISOString(),
      remark: remarkParts.length > 0 ? remarkParts.join(" | ") : null,
    };

    const { data: moveTransaction, error: txError } = await supabase
      .from("transactions")
      .insert(transactionPayload)
      .select("*")
      .single();

    if (txError) {
      return internalError(txError.message);
    }

    const files = formData.getAll("evidence").filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length > MAX_FILES) {
      return badRequest(`Maximum ${MAX_FILES} files are allowed`);
    }

    for (const file of files) {
      if (!isAllowedFile(file)) {
        return badRequest("Allowed file types: PDF, JPG, PNG, HEIC");
      }
      if (file.size > MAX_FILE_SIZE) {
        return badRequest("One or more files exceed 20MB limit");
      }
    }

    const fileInserts: FileInsert[] = [];

    for (const file of files) {
      const path = `${body.asset_no}/move/${moveTransaction.id}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

      if (uploadError) {
        return internalError(uploadError.message);
      }

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

      fileInserts.push({
        transaction_id: moveTransaction.id,
        file_url: data.publicUrl,
        file_type: file.type || extOf(file.name) || "unknown",
      });
    }

    let savedFiles: Array<{ id: string; transaction_id: string; file_url: string; file_type: string; created_at: string }> = [];

    if (fileInserts.length > 0) {
      const { data: insertedFiles, error: filesError } = await supabase
        .from("files")
        .insert(fileInserts)
        .select("*");

      if (filesError) {
        return internalError(filesError.message);
      }

      savedFiles = insertedFiles ?? [];
    }

    return Response.json({
      ok: true,
      data: {
        location: insertedLocation,
        transaction: moveTransaction,
        files: savedFiles,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid request payload");
    }

    return internalError(error instanceof Error ? error.message : "Unable to move asset");
  }
}
