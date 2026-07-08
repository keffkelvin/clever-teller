import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, ShoppingBag, AlertTriangle, Wallet, Package } from "lucide-react";
import { formatMoney } from "@/lib/money";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Photon POS" }] }),
  component: DashboardPage,
});

type Sale = { id: string; total: number; created_at: string; payment_method: string };
type Product = { id: string; name: string; stock: number; low_stock_threshold: number; price: number };

function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [low, setLow] = useState<Product[]>([]);
  const [top, setTop] = useState<{ name: string; qty: number; total: number }[]>([]);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    (async () => {
      const since = new Date(from);
      const until = new Date(new Date(to).getTime() + 86400000);
      const { data: s } = await supabase
        .from("sales").select("id,total,created_at,payment_method")
        .gte("created_at", since.toISOString()).lt("created_at", until.toISOString())
        .order("created_at", { ascending: false });
      setSales((s ?? []) as Sale[]);

      const { data: p } = await supabase.from("products").select("id,name,stock,low_stock_threshold,price");
      const lowList = (p ?? []).filter((x: Product) => x.stock <= x.low_stock_threshold).slice(0, 8);
      setLow(lowList as Product[]);

      const { data: items } = await supabase
        .from("sale_items").select("product_name,quantity,line_total")
        .gte("created_at", since.toISOString()).lt("created_at", until.toISOString());
      const map = new Map<string, { qty: number; total: number }>();
      (items ?? []).forEach((i: { product_name: string; quantity: number; line_total: number }) => {
        const cur = map.get(i.product_name) ?? { qty: 0, total: 0 };
        cur.qty += Number(i.quantity);
        cur.total += Number(i.line_total);
        map.set(i.product_name, cur);
      });
      const arr = Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
      arr.sort((a, b) => b.qty - a.qty);
      setTop(arr.slice(0, 5));
    })();
  }, [from, to]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const todaySales = sales.filter((s) => new Date(s.created_at) >= today);
  const monthSales = sales.filter((s) => new Date(s.created_at) >= monthStart);
  const todayCash = todaySales.filter((s) => s.payment_method === "cash").reduce((a, b) => a + Number(b.total), 0);

  const chartData = (() => {
    const days: { date: string; total: number }[] = [];
    const start = new Date(from); start.setHours(0, 0, 0, 0);
    const end = new Date(to); end.setHours(0, 0, 0, 0);
    const span = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    for (let i = 0; i < span; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const total = sales
        .filter((s) => { const t = new Date(s.created_at); return t >= d && t < next; })
        .reduce((a, b) => a + Number(b.total), 0);
      days.push({ date: d.toLocaleDateString("en-KE", { month: "short", day: "numeric" }), total });
    }
    return days;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening in your shop today.</p>
        </div>
        <div className="flex items-end gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" /></div>
          <Button asChild><Link to="/pos">Open Register</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Today's sales" value={String(todaySales.length)} sub={formatMoney(todaySales.reduce((a, b) => a + Number(b.total), 0))} />
        <StatCard icon={TrendingUp} label="This month" value={formatMoney(monthSales.reduce((a, b) => a + Number(b.total), 0))} sub={`${monthSales.length} sales`} />
        <StatCard icon={Wallet} label="Cash today" value={formatMoney(todayCash)} sub="Drawer" />
        <StatCard icon={AlertTriangle} label="Low stock" value={String(low.length)} sub="Need restock" tone={low.length ? "warn" : "ok"} />
      </div>

      <Card>
        <CardHeader><CardTitle>Sales {from} → {to}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Area type="monotone" dataKey="total" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Top products (30d)</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent className="p-0">
            {top.length === 0 ? <p className="px-6 pb-6 text-sm text-muted-foreground">No sales yet.</p> :
              <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                <TableBody>{top.map((t) => (
                  <TableRow key={t.name}><TableCell className="font-medium">{t.name}</TableCell><TableCell className="text-right">{t.qty}</TableCell><TableCell className="text-right">{formatMoney(t.total)}</TableCell></TableRow>
                ))}</TableBody>
              </Table>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Low stock alert</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent className="p-0">
            {low.length === 0 ? <p className="px-6 pb-6 text-sm text-muted-foreground">All products stocked.</p> :
              <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Stock</TableHead></TableRow></TableHeader>
                <TableBody>{low.map((p) => (
                  <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right"><Badge variant={p.stock <= 0 ? "destructive" : "secondary"}>{p.stock}</Badge></TableCell></TableRow>
                ))}</TableBody>
              </Table>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; tone?: "warn" | "ok" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          <Icon className={tone === "warn" ? "h-4 w-4 text-destructive" : "h-4 w-4 text-muted-foreground"} />
        </div>
        <div className="text-2xl font-bold mt-2">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}