import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Trash2, Search, X, Package, Save, Printer, ScanBarcode, FileText, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { printHTML } from "@/lib/print";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
};
type Customer = { id: string; name: string; phone: string | null };
type Discount = {
  id: string;
  name: string;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};
type OpenRegister = { id: string; opened_at: string; opening_cash: number };

type CartLine = {
  product: Product;
  qty: number;
  discount: number;
};

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({ meta: [{ title: "Register — Shop POS" }] }),
  component: PosPage,
  validateSearch: (s: Record<string, unknown>) => ({
    draft: typeof s.draft === "string" ? s.draft : undefined,
  }),
});

function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [discountId, setDiscountId] = useState<string>("none");
  const [openRegister, setOpenRegister] = useState<OpenRegister | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("walkin");
  const [payment, setPayment] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCharges, setShippingCharges] = useState(0);
  const [tendered, setTendered] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const search$ = useSearch({ from: "/_authenticated/pos" });

  // global barcode scanner: typing fast then Enter
  const scanBuf = useRef<{ buf: string; t: number }>({ buf: "", t: 0 });

  const load = async () => {
    const sbAny = supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (c: string, o?: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>;
          eq: (k: string, v: string) => { order: (c: string, o?: { ascending: boolean }) => { maybeSingle: () => Promise<{ data: unknown }> } };
        };
      };
    };
    const [{ data: pd, error }, { data: cd }, { data: dd }, { data: reg }, { data: bs }] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,sku,barcode,category,price,stock,image_url")
        .order("name"),
      supabase.from("customers").select("id,name,phone").order("name"),
      sbAny.from("discounts").select("id,name,discount_type,discount_amount,starts_at,ends_at,is_active").order("priority", { ascending: false }) as unknown as Promise<{ data: Discount[] | null; error: { message: string } | null }>,
      sbAny.from("cash_registers").select("id,opened_at,opening_cash").eq("status", "open").order("opened_at", { ascending: false }).maybeSingle() as unknown as Promise<{ data: OpenRegister | null }>,
      supabase.from("business_settings").select("default_tax_rate").maybeSingle() as unknown as Promise<{ data: { default_tax_rate: number | null } | null }>,
    ]);
    if (error) return toast.error(error.message);
    setProducts((pd ?? []) as Product[]);
    setCustomers((cd ?? []) as Customer[]);
    const now = new Date();
    setDiscounts(((dd ?? []) as Discount[]).filter((d) =>
      d.is_active &&
      (!d.starts_at || new Date(d.starts_at) <= now) &&
      (!d.ends_at || new Date(d.ends_at) >= now),
    ));
    setOpenRegister(reg ?? null);
    const dr = Number((bs as { default_tax_rate?: number | null } | null)?.default_tax_rate);
    if (!Number.isNaN(dr) && dr > 0) setTaxRate((cur) => cur || dr);
  };

  useEffect(() => { load(); searchRef.current?.focus(); }, []);

  // Recall a draft into the cart from ?draft=<id>
  useEffect(() => {
    const id = search$.draft;
    if (!id || products.length === 0) return;
    (async () => {
      const sbAny = supabase as unknown as { from: (t: string) => { select: (q: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { id: string; customer_id: string | null; tax_rate: number | null; discount: number } | null }>; order: (c: string, o: { ascending: boolean }) => Promise<{ data: { product_id: string | null; quantity: number; unit_price: number; discount: number }[] | null }> } } } };
      const [{ data: d }, { data: items }] = await Promise.all([
        sbAny.from("drafts").select("id,customer_id,tax_rate,discount").eq("id", id).maybeSingle(),
        sbAny.from("draft_items").select("product_id,quantity,unit_price,discount").eq("draft_id", id).order("created_at", { ascending: true }),
      ]);
      if (!d || !items) return;
      const lines: CartLine[] = [];
      for (const it of items) {
        const p = products.find((x) => x.id === it.product_id);
        if (p) lines.push({ product: p, qty: Number(it.quantity), discount: Number(it.discount) });
      }
      setCart(lines);
      setCustomerId(d.customer_id ?? "walkin");
      setTaxRate(Number(d.tax_rate) || 0);
      setDiscount(Number(d.discount) || 0);
      toast.success("Draft recalled");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search$.draft, products.length]);

  // global barcode listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && /input|textarea|select/i.test(tgt.tagName)) return;
      const now = Date.now();
      if (now - scanBuf.current.t > 100) scanBuf.current.buf = "";
      scanBuf.current.t = now;
      if (e.key === "Enter") {
        const code = scanBuf.current.buf.trim();
        scanBuf.current.buf = "";
        if (code.length >= 3) addByCode(code);
      } else if (e.key.length === 1) {
        scanBuf.current.buf += e.key;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const addByCode = (code: string) => {
    const p = products.find((x) => x.barcode === code || x.sku === code);
    if (!p) return toast.error(`No product for ${code}`);
    addToCart(p);
  };

  const categories = useMemo(() => {
    const s = new Set(products.map((p) => p.category));
    return ["all", ...Array.from(s).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (q === "" ||
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q)),
    );
  }, [products, search, category]);

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return toast.error(`${p.name} is out of stock`);
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        if (existing.qty + 1 > p.stock) {
          toast.error(`Only ${p.stock} in stock`);
          return prev;
        }
        return prev.map((l) =>
          l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { product: p, qty: 1, discount: 0 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.product.id !== id) return l;
          const next = l.qty + delta;
          if (next > l.product.stock) {
            toast.error(`Only ${l.product.stock} in stock`);
            return l;
          }
          return { ...l, qty: next };
        })
        .filter((l) => l.qty > 0),
    );
  };

  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.product.id !== id));

  const subtotal = cart.reduce((s, l) => s + l.qty * Number(l.product.price), 0);
  const promo = discounts.find((d) => d.id === discountId);
  const promoAmount = promo
    ? promo.discount_type === "percentage"
      ? +((subtotal * Number(promo.discount_amount)) / 100).toFixed(2)
      : Number(promo.discount_amount)
    : 0;
  const afterDiscount = Math.max(0, subtotal - discount - promoAmount);
  const tax = +(afterDiscount * (taxRate / 100)).toFixed(2);
  const total = +(afterDiscount + tax).toFixed(2);
  const tenderedN = Number(tendered) || 0;
  const change = Math.max(0, tenderedN - total);

  const printReceipt = async (invoiceNo: string) => {
    const { data: bs } = await supabase.from("business_settings").select("*").maybeSingle();
    const cust = customers.find((c) => c.id === customerId);
    const shop = (bs as { shop_name?: string } | null)?.shop_name ?? "Shop";
    const addr = (bs as { address?: string } | null)?.address ?? "";
    const phone = (bs as { phone?: string } | null)?.phone ?? "";
    const kra = (bs as { kra_pin?: string } | null)?.kra_pin ?? "";
    const header = (bs as { receipt_header?: string } | null)?.receipt_header ?? "";
    const footer = (bs as { receipt_footer?: string } | null)?.receipt_footer ?? "Thank you!";
    printHTML(`
      <div style="font-family:monospace;width:280px;padding:8px;font-size:12px">
        <div style="text-align:center;font-weight:700;font-size:14px">${shop}</div>
        <div style="text-align:center">${addr}</div>
        <div style="text-align:center">${phone}</div>
        ${kra ? `<div style="text-align:center">KRA PIN: ${kra}</div>` : ""}
        ${header ? `<div style="text-align:center;margin-top:4px">${header}</div>` : ""}
        <hr/>
        <div>Receipt: ${invoiceNo}</div>
        <div>Date: ${new Date().toLocaleString("en-KE")}</div>
        <div>Customer: ${cust?.name ?? "Walk-in"}</div>
        <div>Payment: ${payment.replace("_"," ")}</div>
        <hr/>
        ${cart.map(l => `<div style="display:flex;justify-content:space-between">
          <span>${l.product.name} x${l.qty}</span><span>${formatMoney(l.qty*l.product.price)}</span></div>`).join("")}
        <hr/>
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
        ${discount?`<div style="display:flex;justify-content:space-between"><span>Discount</span><span>-${formatMoney(discount)}</span></div>`:""}
        ${tax?`<div style="display:flex;justify-content:space-between"><span>Tax ${taxRate}%</span><span>${formatMoney(tax)}</span></div>`:""}
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:13px"><span>TOTAL</span><span>${formatMoney(total)}</span></div>
        ${tenderedN?`<div style="display:flex;justify-content:space-between"><span>Tendered</span><span>${formatMoney(tenderedN)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Change</span><span>${formatMoney(change)}</span></div>`:""}
        <hr/>
        <div style="text-align:center;margin-top:6px">${footer}</div>
      </div>`);
  };

  const reset = () => {
    setCart([]); setCustomerId("walkin"); setDiscount(0); setTendered(""); setPayment("cash"); setDiscountId("none");
    setShippingAddress(""); setShippingCharges(0);
  };

  const holdSale = async () => {
    if (cart.length === 0) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const cust = customers.find((c) => c.id === customerId);
    const sbAny = supabase as unknown as { from: (t: string) => { insert: (v: unknown) => { select: () => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } } & Promise<{ error: { message: string } | null }> } };
    const { data: d, error } = await sbAny.from("drafts").insert({
      owner_id: u.user.id, draft_type: "draft",
      customer_id: cust?.id ?? null, customer_name: cust?.name ?? null,
      contact_number: cust?.phone ?? null,
      subtotal, tax, tax_rate: taxRate, discount, total,
    }).select().single();
    if (error || !d) return toast.error(error?.message ?? "Failed");
    await sbAny.from("draft_items").insert(cart.map((l) => ({
      draft_id: d.id, owner_id: u.user!.id,
      product_id: l.product.id, product_name: l.product.name,
      unit_price: l.product.price, quantity: l.qty,
      discount: l.discount, line_total: l.qty * l.product.price - l.discount,
    })));
    toast.success("Sale held as draft");
    reset();
  };

  const checkout = async (andPrint = false) => {
    if (cart.length === 0) return;
    if (payment === "cash" && !openRegister) {
      return toast.error("Open a cash register session before taking cash payments.");
    }
    setProcessing(true);
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) {
      setProcessing(false);
      return toast.error("Not signed in");
    }
    const cust = customers.find((c) => c.id === customerId);
    const paid = payment === "cash" ? Math.min(total, tenderedN || total) : total;
    const status = paid >= total ? "paid" : paid > 0 ? "partial" : "due";
    const { data: sale, error } = await supabase
      .from("sales")
      .insert({
        owner_id: user.id,
        subtotal,
        discount: discount + promoAmount,
        tax,
        tax_rate: taxRate,
        total: total + Number(shippingCharges || 0),
        payment_method: payment,
        customer_name: cust?.name ?? null,
        customer_id: cust?.id ?? null,
        contact_number: cust?.phone ?? null,
        amount_paid: paid,
        payment_status: status,
        sale_type: "pos",
        register_id: payment === "cash" ? openRegister?.id ?? null : null,
        shipping_address: shippingAddress || null,
        shipping_charges: Number(shippingCharges) || 0,
        shipping_status: shippingAddress ? "pending" : null,
      } as never)
      .select()
      .single();
    if (error || !sale) {
      setProcessing(false);
      return toast.error(error?.message ?? "Sale failed");
    }
    const items = cart.map((l) => ({
      sale_id: sale.id,
      owner_id: user.id,
      product_id: l.product.id,
      product_name: l.product.name,
      unit_price: l.product.price,
      quantity: l.qty,
      discount: l.discount,
      line_total: l.qty * Number(l.product.price) - l.discount,
    }));
    const { error: itemsErr } = await supabase.from("sale_items").insert(items);
    if (itemsErr) {
      setProcessing(false);
      return toast.error(itemsErr.message);
    }
    // Atomic stock decrement via RPC — avoids race conditions on concurrent sales
    await Promise.all(
      cart.map((l) =>
        (supabase as unknown as { rpc: (n: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }> })
          .rpc("decrement_stock", { p_product_id: l.product.id, p_quantity: l.qty }),
      ),
    );
    toast.success(`Sale complete — ${formatMoney(total)}${change ? ` · Change ${formatMoney(change)}` : ""}`);
    if (andPrint) await printReceipt((sale as { invoice_no: string }).invoice_no);
    reset();
    setProcessing(false);
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/* Products */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search name / SKU / barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length === 1) { addToCart(filtered[0]); setSearch(""); }
              }}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2"><ScanBarcode className="h-3 w-3"/> Barcode scanner ready — scan anywhere</div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button asChild variant="outline" size="sm"><Link to="/drafts"><FileText className="h-3 w-3" /> Recall draft</Link></Button>
          {openRegister ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-3 w-3" /> Register open since {new Date(openRegister.opened_at).toLocaleTimeString("en-KE")}
            </span>
          ) : (
            <Button asChild variant="ghost" size="sm" className="text-amber-600">
              <Link to="/cash-register"><Wallet className="h-3 w-3" /> Open cash register</Link>
            </Button>
          )}
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No products yet.</p>
              <p className="text-sm">Add some in the Inventory tab.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className={cn(
                  "text-left rounded-lg border bg-card p-3 transition-all hover:border-primary hover:shadow-md",
                  p.stock <= 0 && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="aspect-square rounded-md bg-muted mb-2 flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="font-medium text-sm line-clamp-2">{p.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-semibold">{formatMoney(p.price)}</span>
                  <Badge variant={p.stock <= 0 ? "destructive" : p.stock < 5 ? "secondary" : "outline"} className="text-xs">
                    {p.stock}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart */}
      <Card className="lg:sticky lg:top-20 h-fit">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Current Sale</CardTitle>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCart([])}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Tap a product to add it
            </p>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {cart.map((l) => (
                <div key={l.product.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{l.product.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {formatMoney(l.product.price)} × {l.qty}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.product.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-medium">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.product.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.product.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walkin">Walk-in customer</SelectItem>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.phone?` · ${c.phone}`:""}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit">Credit (on account)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Discount KSh"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tax %</Label>
                <Input type="number" min={0} max={100} step="0.01" value={taxRate || ""} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Cash tendered</Label>
                <Input type="number" min={0} step="0.01" placeholder="0.00" value={tendered} onChange={(e) => setTendered(e.target.value)} />
              </div>
            </div>
            {discounts.length > 0 && (
              <div>
                <Label className="text-xs">Promo discount</Label>
                <Select value={discountId} onValueChange={setDiscountId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No promo</SelectItem>
                    {discounts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} — {d.discount_type === "percentage" ? `${d.discount_amount}%` : formatMoney(d.discount_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <div>
                <Label className="text-xs">Shipping address (optional)</Label>
                <Input placeholder="Delivery address" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Ship. fee</Label>
                <Input type="number" min={0} step="0.01" value={shippingCharges || ""} onChange={(e) => setShippingCharges(Number(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{formatMoney(subtotal)}</span>
            </div>
            {promoAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{promo?.name ?? "Promo"}</span><span>− {formatMoney(promoAmount)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span><span>− {formatMoney(discount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax {taxRate}%</span><span>{formatMoney(tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>Total</span><span>{formatMoney(total)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between font-medium text-primary">
                <span>Change</span><span>{formatMoney(change)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={cart.length === 0} onClick={holdSale}>
              <Save className="h-4 w-4" /> Hold
            </Button>
            <Button variant="outline" disabled={cart.length === 0 || processing} onClick={() => checkout(true)}>
              <Printer className="h-4 w-4" /> Pay & print
            </Button>
          </div>
          <Button className="w-full" size="lg" disabled={cart.length === 0 || processing} onClick={() => checkout(false)}>
            {processing ? "Processing…" : `Charge ${formatMoney(total)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}