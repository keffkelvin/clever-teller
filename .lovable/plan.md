## Goal

Grow the current 3-page POS (Register, Inventory, Sales) into a full retail management system inspired by the E.D.A POS reference, tailored to a Kenyan electronics/electricals shop. Currency = KES (KSh), mobile money option = M-Pesa.

The reference has ~15 modules and ~17 reports. Building all of it in one shot would take many turns and produce a fragile, shallow result. I'll do it in **4 phases**, each one shippable on its own. You can re-prioritise between phases.

---

## Global changes (applied in Phase 1, affect everything after)

- Currency switched from `GH₵` to `KSh` everywhere; a single `formatMoney()` helper so we only change it once if needed.
- Payment methods updated: **Cash, M-Pesa, Card, Bank Transfer, Credit (on account)**.
- Sidebar layout (collapsible groups like the reference) replacing the top nav, with a top bar that keeps user name + quick "POS" / new sale shortcut.
- Brand colour tuned toward a deeper blue (closer to the reference), but kept on our existing design tokens — no inline colors.
- Roles: `admin`, `manager`, `cashier` stored in a separate `user_roles` table with `has_role()` (security best practice). First sign-up auto-becomes `admin`.

---

## Phase 1 — Foundation + core daily-ops (this turn, if you approve)

The minimum to actually run the shop day-to-day.

1. **Auth & roles** — `user_roles` table, `has_role()` function, role-aware menus, first user = admin.
2. **Business Settings** — shop name, address, phone, KRA PIN, logo, receipt header/footer, low-stock threshold default. One row per owner.
3. **Contacts** → Customers + Suppliers (separate tabs), with name, phone, email, address, opening balance, notes. Used by sales, purchases, and receipts.
4. **Products upgrades** — Categories, Brands, Units (Pc, Box, Mtr, Roll, Set), barcode field, cost vs selling price, low-stock threshold per product, image. Bulk CSV import + barcode-label print sheet (A4 grid).
5. **Purchases** — record stock-in from a supplier: line items, totals, payment status, auto-increments product stock. List + view + edit.
6. **POS upgrades** — barcode scan (USB scanner = keyboard input, auto-add on Enter), select customer, tax %, hold/recall sale (drafts), thermal-friendly receipt (58 mm + A4 print), M-Pesa as default mobile money label, change calculation, "Cash tendered" field.
7. **Sales** — receipt re-print, refund/return (creates a sell-return that restores stock), filter by date / cashier / payment method.
8. **Dashboard (Home)** — KSh totals: Today's Sales, This Month, Cash in Drawer (per session), Top Products, Low-Stock list, 30-day sales line chart, Recent Sales.

Deliverable after Phase 1: a working single-shop POS your cashier can use end-to-end, with proper inventory, suppliers, and reporting basics.

---

## Phase 2 — Expense, stock control, multi-user

1. **Expenses** — categories (Rent, Salaries, Electricity, Transport, Misc.), add expense, list, monthly totals.
2. **Stock Adjustment** — add/remove stock with reason (damage, theft, recount), audit trail.
3. **Stock Transfer** — only relevant once we have multiple locations; deferred until Phase 3 unless you confirm you have >1 shop.
4. **User Management** — invite staff, assign role, deactivate, per-user sales/activity log.
5. **Discounts** — promo codes + per-line discount + per-bill discount (already partial).
6. **Quotations / Drafts** — save a cart as quotation (no stock change), convert to sale later.

---

## Phase 3 — Reports & multi-location

1. **Reports** (built on top of existing sales / purchases / expenses):
   - Profit & Loss, Purchase & Sale, Stock Report, Product Sell Report, Product Purchase Report, Expense Report, Sell/Purchase Payment Report, Tax Report, Customer & Supplier Report, Trending Products, Register Report, Activity Log.
   - Each report: date range filter, CSV + PDF export, print.
2. **Business Locations** — multi-shop support; product stock becomes per-location, sales/purchases tagged to location, Stock Transfers between locations.
3. **Tax Rates** — VAT 16% preset; assign default tax per product; tax-inclusive vs exclusive pricing toggle.

---

## Phase 4 — Extras (optional, lowest priority)

1. **Asset Management** — track shop assets (fridges, display cases, tools): category, purchase date, value, allocated to staff, maintenance log.
2. **Catalogue QR + Catalogue Orders** — public catalogue page per shop, QR code customers scan to browse and order; orders inbox pings WhatsApp.
3. **Sales Commission Agents** — % commission per sale per agent, commission report.
4. **Notification Templates** — SMS/email templates for receipts, payment reminders. (SMS needs an Africa's Talking key from you; I'll surface that when we get there.)
5. **Customer Groups** with group-level pricing / discount.
6. **Product Variations** (e.g. cable length / wire gauge / colour).
7. **Warranties** — warranty plans attached to products, surfaced on receipts.

---

## Technical details

- Backend: Lovable Cloud (Postgres + Auth). All tables RLS-scoped to `owner_id = auth.uid()`; admin/manager helper policies for shared shop data once roles exist.
- New tables for Phase 1: `business_settings`, `customers`, `suppliers`, `categories`, `brands`, `units`, `purchases`, `purchase_items`, `sale_returns`, `sale_return_items`, `user_roles` + `app_role` enum + `has_role()` function. Existing `products` gets `category_id`, `brand_id`, `unit_id`, `barcode`, `tax_rate` added.
- Currency helper `formatMoney(n)` → `KSh 1,234.50` using `Intl.NumberFormat("en-KE")`.
- Receipt printing uses a hidden printable React component + `window.print()` with a 58 mm CSS stylesheet (no native printer driver needed).
- Barcode scan: hidden focused input in POS, debounced; existing search input doubles as scan target.
- CSV import: client-side parse (PapaParse), preview, then `insert` in batches.

---

## What I need from you to start Phase 1

1. **Confirm Phase 1 scope** above — or tell me to drop/move items.
2. **Shop info** to seed Business Settings (or leave blank and you fill it in): shop name (Photon Electronics & Electricals?), location, phone, KRA PIN.
3. **VAT**: charge 16% VAT on sales, or no tax for now?
4. **Existing data**: the current `sales` / `products` tables stay; I'll add columns, not drop anything.

Approve and I'll start Phase 1 immediately.