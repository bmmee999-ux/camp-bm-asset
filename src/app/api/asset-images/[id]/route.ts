import { badRequest, internalError, requireSupabase } from "@/lib/api";

export const dynamic = "force-dynamic";

function parsePublicStorageUrl(url: string) {
  const marker = "/storage/v1/object/public/";
  const idx = url.indexOf(marker);
  if (idx < 0) return null;

  const tail = url.slice(idx + marker.length);
  const firstSlash = tail.indexOf("/");
  if (firstSlash < 0) return null;

  const bucket = tail.slice(0, firstSlash);
  const path = tail.slice(firstSlash + 1);
  if (!bucket || !path) return null;

  return { bucket, path };
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const { id } = await params;
  const imageId = id?.trim();

  if (!imageId) {
    return badRequest("image id is required");
  }

  const { data: row, error: rowErr } = await supabase
    .from("asset_images")
    .select("id, file_url")
    .eq("id", imageId)
    .maybeSingle();

  if (rowErr) {
    return internalError(rowErr.message);
  }

  if (!row) {
    return badRequest("image not found");
  }

  const parsed = parsePublicStorageUrl(row.file_url);
  if (parsed) {
    await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  }

  const { error: delErr } = await supabase.from("asset_images").delete().eq("id", imageId);
  if (delErr) {
    return internalError(delErr.message);
  }

  return Response.json({ ok: true });
}

