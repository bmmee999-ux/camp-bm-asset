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
  const fileId = id?.trim();

  if (!fileId) {
    return badRequest("file id is required");
  }

  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select("id, file_url")
    .eq("id", fileId)
    .maybeSingle();

  if (fileErr) {
    return internalError(fileErr.message);
  }

  if (!file) {
    return badRequest("file not found");
  }

  const parsed = parsePublicStorageUrl(file.file_url);
  if (parsed) {
    await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  }

  const { error: delErr } = await supabase.from("files").delete().eq("id", fileId);
  if (delErr) {
    return internalError(delErr.message);
  }

  return Response.json({ ok: true });
}
