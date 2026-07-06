import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import lowStock from "./tools/low-stock";
import recentSales from "./tools/recent-sales";
import salesSummary from "./tools/sales-summary";
import listCustomers from "./tools/list-customers";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "photon-pos-mcp",
  title: "Photon POS",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Photon POS shop: inventory, low-stock alerts, customers, and sales. All calls run as the signed-in user with row-level security applied.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, lowStock, recentSales, salesSummary, listCustomers],
});