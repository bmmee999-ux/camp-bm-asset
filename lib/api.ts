import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SupabaseRequirement =
  | { ok: true; supabase: SupabaseClient<Database> }
  | { ok: false; response: Response };

export function requireSupabase(): SupabaseRequirement {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          message:
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.",
        },
        { status: 500 },
      ),
    };
  }

  return { ok: true, supabase };
}

export function badRequest(message: string) {
  return Response.json({ ok: false, message }, { status: 400 });
}

export function internalError(message: string) {
  return Response.json({ ok: false, message }, { status: 500 });
}
