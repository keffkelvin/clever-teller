import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthorized, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "sales_summary",
  title: "Sales summary",
  description: "Aggregate sales totals and count between two dates (inclusive, ISO 8601).",
  inputSchema: {
    from: z.string().describe("Start timestamp, ISO 8601 (e.g. 2026-01-01)."),
    to: z.string().describe("End timestamp, ISO 8601."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthorized();
    const { data, error } = await supabaseForUser(ctx)
      .from("sales")
      .select("total, tax, discount, payment_method")
      .gte("created_at", from)
      .lte("created_at", to);
    if (error) return errorResult(error.message);
    const rows = data ?? [];
    const summary = {
      count: rows.length,
      total: rows.reduce((s, r) => s + Number(r.total ?? 0), 0),
      tax: rows.reduce((s, r) => s + Number(r.tax ?? 0), 0),
      discount: rows.reduce((s, r) => s + Number(r.discount ?? 0), 0),
      by_payment_method: rows.reduce<Record<string, { count: number; total: number }>>((acc, r) => {
        const k = r.payment_method ?? "unknown";
        acc[k] ??= { count: 0, total: 0 };
        acc[k].count += 1;
        acc[k].total += Number(r.total ?? 0);
        return acc;
      }, {}),
    };
    return jsonResult(summary);
  },
});