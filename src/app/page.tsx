import { AssetManagementSystem } from "@/components/asset-management-system";
import { getSupabaseEnvStatus } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const env = getSupabaseEnvStatus();

  return (
    <>
      {!env.hasUrl || !env.hasServiceRole ? (
        <div className="mx-auto mt-6 w-full max-w-7xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 md:px-8">
          Supabase is not fully configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
          in environment variables.
        </div>
      ) : null}
      <AssetManagementSystem />
    </>
  );
}
