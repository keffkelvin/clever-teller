import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  entity: string,
  entity_id: string | null,
  action: string,
  details?: Record<string, unknown>,
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const client = supabase as unknown as {
    from: (t: string) => { insert: (r: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
  };
  await client.from("audit_logs").insert({
    owner_id: u.user.id,
    actor_id: u.user.id,
    entity,
    entity_id,
    action,
    details: details ?? null,
  });
}