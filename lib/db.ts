/**
 * Database access via Supabase.
 * Use createClient() from server (server components, route handlers) or
 * createClient() from lib/supabase/client (browser).
 */
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function getDb() {
  return createSupabaseServerClient();
}
