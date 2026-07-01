import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

type Sale = { id: string; invoice_no: string | null; total: number; created_at: string; customer_name: string | null };
type SaleItem = { id: string; product_id: string | null; product_name: string; quantity: number; unit_price: number };
type Ret = { id: string; sale_id: string | null; return_date: string; total: number; reason: string | null };
type RetWithInv = Ret & { invoice_no?: string | null };

export const Route = createFileRoute("/_authenticated/sell-returns")({
  head: () => ({ meta: [{ title: "Sell Returns — Shop POS" }] }),
  component: SellReturnsPage,
});

function SellReturnsPage() {
  const [returns, setReturns] = useState<RetWithInv[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [open, setOpen] = useState(false);
  const [saleId, setSaleId] = useState("");
  const [items, setItems] = useState<(SaleItem & { returnQty: number })[]>([]);
  const [reason, setReason] = useState("");

  const load = async () => {
    const [{ data: r }, { data: s }] = await Promise.all([
      (supabase as unknown as { from: (t: string) => { select: (q: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: (Ret & { sales: { invoice_no: string | null } | null })[] | null }> } } })
        .from("sale_returns").select("id,sale_id,return_date,total,reason,sales(invoice_no)").order("return_date", { ascending: false }),
      supabase.from("sales").select("id,invoice_no,total,created_at,customer_name").order("created_at", { ascending: false }).limit(100),
    ]);
    setReturns(((r ?? []) as (Ret & { sales: { invoice_no: string | null } | null })[]).map((row) => ({ ...row, invoice_no: row.sales?.invoice_no ?? null })));
    setSales((s ?? []) as Sale[]);
  };
  useEffect(() => { load(); }, []);

  const pickSale = async (id: string) => {
    setSaleId(id);
    const [{ data }, { data: prior }] = await Promise.all([
      supabase.from("sale_items").select("id,product_id,product_name,quantity,unit_price").eq("sale_id", id),
      // prior returned qty per product for this sale
      (supabase as unknown as { from: (t: string) => { select: (q: string) => { eq: (k: string, v: string) => Promise<{ data: { product_id: string | null; quantity: number; sale_returns: { sale_id: string | null } | null }[] | null }> } } })
        .from("sale_return_items")
        .select("product_id,quantity,sale_returns!inner(sale_id)")
        .eq("sale_returns.sale_id", id),
    ]);
    const returnedByProduct = new Map<string, number>();
    for (const row of (prior ?? [])) {
      if (!row.product_id) continue;
      returnedByProduct.set(row.product_id, (returnedByProduct.get(row.product_id) ?? 0) + Number(row.quantity));
    }
    setItems(((data ?? []) as SaleItem[]).map((i) => {
      const already = i.product_id ? (returnedByProduct.get(i.product_id) ?? 0) : 0;
      const remaining = Math.max(0, i.quantity - already);
      return { ...i, quantity: remaining, returnQty: 0 };
    }).filter((i) => i.quantity > 0));
  };

  const submit = async () => {
    const lines = items.filter((i) => i.returnQty > 0);
    if (!saleId || lines.length === 0) return toast.error("Pick a sale and a quantity to return");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const total = lines.reduce((s, l) => s + l.returnQty * Number(l.unit_price), 0);
    const { data: rr, error } = await supabase.from("sale_returns").insert({ owner_id: u.user.id, sale_id: saleId, total, reason: reason || null }).select().single();
    if (error || !rr) return toast.error(error?.message ?? "Failed");
    await supabase.from("sale_return_items").insert(lines.map((l) => ({
      sale_return_id: rr.id, owner_id: u.user!.id, product_id: l.product_id, product_name: l.product_name,
      unit_price: l.unit_price, quantity: l.returnQty, line_total: l.returnQty * Number(l.unit_price),
    })));
    for (const l of lines) {
      if (!l.product_id) continue;
      const { data: p } = await supabase.from("products").select("stock").eq("id", l.product_id).single();
      if (p) await supabase.from("products").update({ stock: (p.stock ?? 0) + l.returnQty }).eq("id", l.product_id);
    }
    toast.success("Return recorded · stock restored");
    setOpen(false); setSaleId(""); setItems([]); setReason("");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Sell Returns</h1><p className="text-sm text-muted-foreground">Refund items and restore stock</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New return</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New Sell Return</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Original sale</Label>
                <Select value={saleId} onValueChange={pickSale}>
                  <SelectTrigger><SelectValue placeholder="Pick a sale" /></SelectTrigger>
                  <SelectContent>
                    {sales.map((s) => <SelectItem key={s.id} value={s.id}>{s.invoice_no || s.id.slice(0,8)} · {s.customer_name || "Walk-in"} · {formatMoney(s.total)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {items.length > 0 && (
                <div className="border rounded-md divide-y">
                  {items.map((i) => (
                    <div key={i.id} className="flex items-center gap-3 p-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{i.product_name}</div>
                        <div className="text-muted-foreground text-xs">Returnable {i.quantity} · {formatMoney(i.unit_price)}</div>
                      </div>
                      <Input type="number" min={0} max={i.quantity} className="w-24" value={i.returnQty || ""} onChange={(e) => setItems((prev) => prev.map((x) => x.id === i.id ? { ...x, returnQty: Math.min(i.quantity, Number(e.target.value) || 0) } : x))} />
                    </div>
                  ))}
                </div>
              )}
              <div><Label>Reason (optional)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged / wrong item / refund…" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Save return</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        {returns.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground"><Undo2 className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No returns yet</p></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Total refunded</TableHead></TableRow></TableHeader>
            <TableBody>{returns.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.return_date).toLocaleString("en-KE")}</TableCell>
                <TableCell className="font-mono text-xs">{r.invoice_no ?? (r.sale_id ? r.sale_id.slice(0,8) : "—")}</TableCell>
                <TableCell className="text-muted-foreground">{r.reason || "—"}</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(r.total)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}