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
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

type Purchase = { id: string; reference_no: string | null; total: number; purchase_date: string };
type Item = { id: string; product_id: string | null; product_name: string; quantity: number; unit_cost: number };
type Ret = { id: string; reference_no: string | null; return_date: string; total: number; reason: string | null };

export const Route = createFileRoute("/_authenticated/purchase-returns")({
  head: () => ({ meta: [{ title: "Purchase Returns — Shop POS" }] }),
  component: PurchaseReturnsPage,
});

function PurchaseReturnsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [returns, setReturns] = useState<Ret[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [open, setOpen] = useState(false);
  const [purchaseId, setPurchaseId] = useState("");
  const [items, setItems] = useState<(Item & { returnQty: number })[]>([]);
  const [reason, setReason] = useState("");

  const load = async () => {
    const { data: r } = await sb.from("purchase_returns").select("id,reference_no,return_date,total,reason").order("return_date", { ascending: false });
    const { data: p } = await supabase.from("purchases").select("id,reference_no,total,purchase_date").order("purchase_date", { ascending: false }).limit(100);
    setReturns((r ?? []) as Ret[]);
    setPurchases((p ?? []) as Purchase[]);
  };
  useEffect(() => { load(); }, []);

  const pickPurchase = async (id: string) => {
    setPurchaseId(id);
    const { data } = await supabase.from("purchase_items").select("id,product_id,product_name,quantity,unit_cost").eq("purchase_id", id);
    setItems(((data ?? []) as Item[]).map((i) => ({ ...i, returnQty: 0 })));
  };

  const submit = async () => {
    const lines = items.filter((i) => i.returnQty > 0);
    if (!purchaseId || lines.length === 0) return toast.error("Pick a purchase and quantities to return");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const total = lines.reduce((s, l) => s + l.returnQty * Number(l.unit_cost), 0);
    const { data: rr, error } = await sb.from("purchase_returns").insert({ owner_id: u.user.id, purchase_id: purchaseId, total, reason: reason || null }).select().single();
    if (error || !rr) return toast.error(error?.message ?? "Failed");
    await sb.from("purchase_return_items").insert(lines.map((l) => ({
      purchase_return_id: rr.id, owner_id: u.user!.id, product_id: l.product_id, product_name: l.product_name,
      unit_cost: l.unit_cost, quantity: l.returnQty, line_total: l.returnQty * Number(l.unit_cost),
    })));
    for (const l of lines) {
      if (!l.product_id) continue;
      const { data: p } = await supabase.from("products").select("stock").eq("id", l.product_id).single();
      if (p) await supabase.from("products").update({ stock: Math.max(0, (p.stock ?? 0) - l.returnQty) }).eq("id", l.product_id);
    }
    toast.success("Purchase return saved");
    setOpen(false); setPurchaseId(""); setItems([]); setReason("");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Purchase Returns</h1><p className="text-sm text-muted-foreground">Return stock to a supplier</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New return</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New Purchase Return</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Original purchase</Label>
                <Select value={purchaseId} onValueChange={pickPurchase}>
                  <SelectTrigger><SelectValue placeholder="Pick a purchase" /></SelectTrigger>
                  <SelectContent>
                    {purchases.map((p) => <SelectItem key={p.id} value={p.id}>{p.reference_no || p.id.slice(0,8)} · {p.purchase_date} · {formatMoney(p.total)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {items.length > 0 && (
                <div className="border rounded-md divide-y">
                  {items.map((i) => (
                    <div key={i.id} className="flex items-center gap-3 p-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{i.product_name}</div>
                        <div className="text-muted-foreground text-xs">Bought {i.quantity} · {formatMoney(i.unit_cost)}</div>
                      </div>
                      <Input type="number" min={0} max={i.quantity} className="w-24" value={i.returnQty || ""} onChange={(e) => setItems((prev) => prev.map((x) => x.id === i.id ? { ...x, returnQty: Math.min(i.quantity, Number(e.target.value) || 0) } : x))} />
                    </div>
                  ))}
                </div>
              )}
              <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged / wrong item…" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        {returns.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground"><RotateCcw className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No purchase returns yet</p></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>{returns.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.return_date}</TableCell>
                <TableCell className="text-muted-foreground">{r.reference_no || "—"}</TableCell>
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