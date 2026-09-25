import { badRequest, internalError, requireSupabase } from "@/lib/api";
import type { LocationInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("move_date", { ascending: false });

  if (error) {
    return internalError(error.message);
  }

  return Response.json({ ok: true, data });
}

export async function POST(request: Request) {
  const requirement = requireSupabase();
  if (!requirement.ok) return requirement.response;
  const { supabase } = requirement;

  const body = (await request.json()) as Partial<LocationInsert>;

  if (!body.asset_no || !body.new_location) {
    return badRequest("asset_no and new_location are required");
  }

  const payload: LocationInsert = {
    asset_no: body.asset_no,
    old_location: body.old_location ?? null,
    new_location: body.new_location,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    move_date: body.move_date ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("locations")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return internalError(error.message);
  }

  return Response.json({ ok: true, data }, { status: 201 });
}
