import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, TrendingUp, ShoppingBag, DollarSign, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { printHTML } from "@/lib/print";

type Sale = {
  id: string;
  invoice_no: string | null;
  total: number;
  subtotal: number;
  discount: number;
  tax: number | null;
  payment_method: string;
  payment_status: string | null;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
};
type SaleItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales — Shop POS" }] }),
  component: SalesPage,
});

function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pay, setPay] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return toast.error(error.message);
      setSales((data ?? []) as Sale[]);
    })();
  }, []);

  const open = async (sale: Sale) => {
    setSelected(sale);
    const { data } = await supabase
      .from("sale_items")
      .select("id,product_name,quantity,unit_price,line_total")
      .eq("sale_id", sale.id);
    setItems((data ?? []) as SaleItem[]);
  };

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (pay !== "all" && s.payment_method !== pay) return false;
      if (from && new Date(s.created_at) < new Date(from)) return false;
      if (to && new Date(s.created_at) > new Date(new Date(to).getTime() + 86400000)) return false;
      if (q && !(s.invoice_no?.toLowerCase().includes(q.toLowerCase()) || (s.customer_name ?? "").toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [sales, pay, from, to, q]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todaySales = sales.filter((s) => new Date(s.created_at) >= today);
  const todayRevenue = todaySales.reduce((s, x) => s + Number(x.total), 0);
  const totalRevenue = filtered.reduce((s, x) => s + Number(x.total), 0);

  const printReceipt = async (s: Sale) => {
    const { data } = await supabase.from("sale_items").select("product_name,quantity,unit_price,line_total").eq("sale_id", s.id);
    const list = (data ?? []) as SaleItem[];
    const rows = list.map((i) => `<tr><td>${i.product_name} × ${i.quantity}</td><td class="right">${formatMoney(i.line_total)}</td></tr>`).join("");
    printHTML(`
      <h1>Receipt</h1>
      <div class="center muted">${s.invoice_no ?? ""}<br/>${new Date(s.created_at).toLocaleString()}</div>
      <div class="line"></div>
      <table>${rows}</table>
      <div class="line"></div>
      <div class="row"><span>Subtotal</span><span>${formatMoney(s.subtotal)}</span></div>
      ${Number(s.tax ?? 0) > 0 ? `<div class="row"><span>Tax</span><span>${formatMoney(s.tax ?? 0)}</span></div>` : ""}
      ${Number(s.discount) > 0 ? `<div class="row"><span>Discount</span><span>− ${formatMoney(s.discount)}</span></div>` : ""}
      <div class="row bold"><span>Total</span><span>${formatMoney(s.total)}</span></div>
      <div class="row"><span>Paid</span><span>${s.payment_method.toUpperCase()}</span></div>
      ${s.customer_name ? `<div class="muted center">${s.customer_name}</div>` : ""}
      <div class="line"></div>
      <div class="center muted">Thank you!</div>
    `);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sales</h1>
        <p className="text-sm text-muted-foreground">Transaction history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Today's revenue" value={formatMoney(todayRevenue)} />
        <StatCard icon={ShoppingBag} label="Today's sales" value={String(todaySales.length)} />
        <StatCard icon={TrendingUp} label="Filtered revenue" value={formatMoney(totalRevenue)} />
      </div>

      <Card><CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div><Label>Payment</Label>
          <Select value={pay} onValueChange={setPay}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="mpesa">M-Pesa</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Search</Label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice / customer" /></div>
      </CardContent></Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No sales match the filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Invoice</TableHead>
                  <TableHead className="hidden sm:table-cell">Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => open(s)}>
                    <TableCell className="font-medium">{new Date(s.created_at).toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">{s.invoice_no ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{s.customer_name || "Walk-in"}</TableCell>
                    <TableCell><Badge variant="outline">{s.payment_method}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(s.total)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => printReceipt(s)}><Printer className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {selected.invoice_no && <div className="font-mono">{selected.invoice_no}</div>}
                <div>{new Date(selected.created_at).toLocaleString()}</div>
                {selected.customer_name && <div>Customer: {selected.customer_name}</div>}
                <div>Payment: {selected.payment_method}</div>
              </div>
              <div className="border-t border-b py-2 space-y-1">
                {items.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span>{i.product_name} × {i.quantity}</span>
                    <span>{formatMoney(i.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(selected.subtotal)}</span></div>
                {Number(selected.tax ?? 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{formatMoney(selected.tax ?? 0)}</span></div>
                )}
                {Number(selected.discount) > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>− {formatMoney(selected.discount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span>{formatMoney(selected.total)}</span></div>
              </div>
              <Button className="w-full" onClick={() => printReceipt(selected)}><Printer className="h-4 w-4" /> Print receipt</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}