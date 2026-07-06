import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthorized, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_customers",
  title: "List customers",
  description: "List customers with contact info. Optional search on name, phone, or email.",
  inputSchema: {
    search: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthorized();
    let q = supabaseForUser(ctx)
      .from("customers")
      .select("id, name, phone, email, address, opening_balance")
      .order("name")
      .limit(limit ?? 50);
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});