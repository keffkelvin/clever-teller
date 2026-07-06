import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthorized, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "recent_sales",
  title: "Recent sales",
  description: "List the most recent sales with totals, payment method and customer.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max sales to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthorized();
    const { data, error } = await supabaseForUser(ctx)
      .from("sales")
      .select("id, invoice_no, created_at, customer_name, payment_method, payment_status, subtotal, tax, discount, total")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});