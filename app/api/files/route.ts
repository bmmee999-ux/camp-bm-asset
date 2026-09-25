import { badRequest, internalError, requireSupabase } from "@/lib/api";
import type { FileInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const { data, error } = await supabase
    .from("files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return internalError(error.message);
  }

  return Response.json({ ok: true, data });
}

export async function POST(request: Request) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const body = (await request.json()) as Partial<FileInsert>;

  if (!body.transaction_id || !body.file_url || !body.file_type) {
    return badRequest("transaction_id, file_url, and file_type are required");
  }

  const payload: FileInsert = {
    transaction_id: body.transaction_id,
    file_url: body.file_url,
    file_type: body.file_type,
  };

  const { data, error } = await supabase.from("files").insert(payload).select("*").single();

  if (error) {
    return internalError(error.message);
  }

  return Response.json({ ok: true, data }, { status: 201 });
}
