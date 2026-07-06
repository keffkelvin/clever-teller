import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthorized, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "low_stock_products",
  title: "Low stock products",
  description: "List products whose current stock is at or below their low-stock threshold.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthorized();
    const { data, error } = await supabaseForUser(ctx)
      .from("products")
      .select("id, name, sku, stock, low_stock_threshold")
      .order("stock");
    if (error) return errorResult(error.message);
    const low = (data ?? []).filter((p) => p.stock <= p.low_stock_threshold);
    return jsonResult(low);
  },
});