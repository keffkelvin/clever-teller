import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Shop POS" }] }),
  component: ReportsPage,
});

type Sale = { id: string; total: number; subtotal: number; discount: number; tax: number | null; payment_method: string; created_at: string };
type SaleItem = { product_name: string; quantity: number; unit_price: number; line_total: number; sale_id: string; product_id: string | null };
type Purchase = { id: string; total: number; created_at: string };
type Expense = { amount: number; expense_date: string; category_name: string | null };
type Product = { id: string; name: string; stock: number; price: number; cost: number | null; low_stock_threshold: number | null };

function startOfMonth() { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [sales, setSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const fromIso = new Date(from).toISOString();
      const toIso = new Date(new Date(to).getTime() + 86400000).toISOString();
      const [s, p, e, pr] = await Promise.all([
        supabase.from("sales").select("id,total,subtotal,discount,tax,payment_method,created_at").gte("created_at", fromIso).lt("created_at", toIso).order("created_at"),
        supabase.from("purchases").select("id,total,created_at").gte("created_at", fromIso).lt("created_at", toIso),
        supabase.from("expenses").select("amount,expense_date,category_name").gte("expense_date", from).lte("expense_date", to),
        supabase.from("products").select("id,name,stock,price,cost,low_stock_threshold"),
      ]);
      setSales((s.data ?? []) as Sale[]);
      setPurchases((p.data ?? []) as Purchase[]);
      setExpenses((e.data ?? []) as Expense[]);
      setProducts((pr.data ?? []) as Product[]);
      const ids = (s.data ?? []).map((x) => x.id);
      if (ids.length) {
        const it = await supabase.from("sale_items").select("product_name,quantity,unit_price,line_total,sale_id,product_id").in("sale_id", ids);
        setItems((it.data ?? []) as SaleItem[]);
      } else setItems([]);
    })();
  }, [from, to]);

  const salesTotal = sales.reduce((s, x) => s + Number(x.total), 0);
  const taxTotal = sales.reduce((s, x) => s + Number(x.tax ?? 0), 0);
  const discountTotal = sales.reduce((s, x) => s + Number(x.discount), 0);
  const purchasesTotal = purchases.reduce((s, x) => s + Number(x.total), 0);
  const expenseTotal = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const costMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, Number(p.cost ?? 0)])), [products]);
  const cogs = items.reduce((s, i) => s + Number(i.quantity) * (i.product_id ? (costMap[i.product_id] ?? 0) : 0), 0);
  const profit = salesTotal - cogs - expenseTotal;

  const byPayment = useMemo(() => {
    const m: Record<string, number> = {};
    sales.forEach((s) => { m[s.payment_method] = (m[s.payment_method] ?? 0) + Number(s.total); });
    return m;
  }, [sales]);

  const topProducts = useMemo(() => {
    const m: Record<string, { name: string; qty: number; total: number }> = {};
    items.forEach((i) => {
      const k = i.product_name;
      if (!m[k]) m[k] = { name: k, qty: 0, total: 0 };
      m[k].qty += Number(i.quantity);
      m[k].total += Number(i.line_total);
    });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 20);
  }, [items]);

  const lowStock = products.filter((p) => p.stock <= Number(p.low_stock_threshold ?? 5));
  const stockValue = products.reduce((s, p) => s + Number(p.stock) * Number(p.cost ?? p.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Sales, profit, stock</p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sales" value={formatMoney(salesTotal)} />
        <Stat label="COGS" value={formatMoney(cogs)} />
        <Stat label="Expenses" value={formatMoney(expenseTotal)} />
        <Stat label="Profit (est.)" value={formatMoney(profit)} accent={profit >= 0 ? "ok" : "bad"} />
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Sales report</CardTitle>
            <Button size="sm" variant="outline" onClick={() => exportCsv("sales", sales as unknown as Record<string, unknown>[])}><Download className="h-3 w-3" /> CSV</Button>
          </CardHeader>
          <CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Discount</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>{sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
                <TableCell className="uppercase text-xs">{s.payment_method}</TableCell>
                <TableCell className="text-right">{formatMoney(s.subtotal)}</TableCell>
                <TableCell className="text-right">{formatMoney(s.tax ?? 0)}</TableCell>
                <TableCell className="text-right">{formatMoney(s.discount)}</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(s.total)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="products">
          <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Top products</CardTitle>
            <Button size="sm" variant="outline" onClick={() => exportCsv("top-products", topProducts as unknown as Record<string, unknown>[])}><Download className="h-3 w-3" /> CSV</Button>
          </CardHeader>
          <CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
            <TableBody>{topProducts.map((p) => (
              <TableRow key={p.name}><TableCell>{p.name}</TableCell><TableCell className="text-right">{p.qty}</TableCell><TableCell className="text-right font-semibold">{formatMoney(p.total)}</TableCell></TableRow>
            ))}</TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card><CardHeader><CardTitle>Payments breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(byPayment).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-2"><span className="uppercase text-xs">{k}</span><span className="font-semibold">{formatMoney(v)}</span></div>
            ))}
            {Object.keys(byPayment).length === 0 && <p className="text-muted-foreground text-sm">No sales in range</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="stock">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Stat label="Stock value (cost)" value={formatMoney(stockValue)} />
            <Stat label="Low-stock items" value={String(lowStock.length)} />
          </div>
          <Card className="mt-3"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Low stock</CardTitle>
            <Button size="sm" variant="outline" onClick={() => exportCsv("low-stock", lowStock as unknown as Record<string, unknown>[])}><Download className="h-3 w-3" /> CSV</Button>
          </CardHeader>
          <CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Threshold</TableHead></TableRow></TableHeader>
            <TableBody>{lowStock.map((p) => (
              <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell className="text-right text-destructive font-semibold">{p.stock}</TableCell><TableCell className="text-right">{p.low_stock_threshold ?? 5}</TableCell></TableRow>
            ))}</TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card><CardHeader><CardTitle>Tax report</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between border-b py-2"><span>Total taxable sales</span><span className="font-semibold">{formatMoney(salesTotal - taxTotal)}</span></div>
            <div className="flex justify-between border-b py-2"><span>Tax collected (VAT)</span><span className="font-semibold">{formatMoney(taxTotal)}</span></div>
            <div className="flex justify-between border-b py-2"><span>Total discount given</span><span className="font-semibold">{formatMoney(discountTotal)}</span></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "ok" | "bad" }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent className={`text-2xl font-bold ${accent === "bad" ? "text-destructive" : accent === "ok" ? "text-emerald-600" : ""}`}>{value}</CardContent>
    </Card>
  );
}