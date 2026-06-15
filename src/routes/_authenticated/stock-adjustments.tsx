import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stock-adjustments")({
  head: () => ({ meta: [{ title: "Stock Adjustments — Shop POS" }] }),
  component: StockAdjustmentsPage,
});

type Product = { id: string; name: string; stock: number };
type Row = { id: string; product_name: string; quantity: number; adjustment_type: string; reason: string | null; created_at: string };

function StockAdjustmentsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", direction: "remove", quantity: "1", adjustment_type: "damage", reason: "" });

  const load = async () => {
    const [p, r] = await Promise.all([
      supabase.from("products").select("id,name,stock").order("name"),
      supabase.from("stock_adjustments").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setProducts((p.data ?? []) as Product[]);
    setRows((r.data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const qty = Number(form.quantity);
    const p = products.find((x) => x.id === form.product_id);
    if (!p || !qty || qty <= 0) return toast.error("Pick product and quantity");
    const signed = form.direction === "remove" ? -qty : qty;
    const newStock = Number(p.stock) + signed;
    if (newStock < 0) return toast.error("Stock cannot go negative");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const ins = await supabase.from("stock_adjustments").insert({
      owner_id: u.user.id, product_id: p.id, product_name: p.name,
      quantity: signed, adjustment_type: form.adjustment_type, reason: form.reason || null,
    });
    if (ins.error) return toast.error(ins.error.message);
    const upd = await supabase.from("products").update({ stock: newStock }).eq("id", p.id);
    if (upd.error) return toast.error(upd.error.message);
    toast.success("Stock adjusted");
    setOpen(false); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Adjustments</h1>
          <p className="text-sm text-muted-foreground">Record damage, theft, recounts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New adjustment</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Product</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (stock {p.stock})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Direction</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add stock</SelectItem>
                    <SelectItem value="remove">Remove stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="col-span-2"><Label>Reason</Label>
                <Select value={form.adjustment_type} onValueChange={(v) => setForm({ ...form, adjustment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="theft">Theft</SelectItem>
                    <SelectItem value="recount">Recount</SelectItem>
                    <SelectItem value="normal">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Note</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No adjustments yet</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead><TableHead>Reason</TableHead>
              </TableRow></TableHeader>
              <TableBody>{rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{r.product_name}</TableCell>
                  <TableCell className="capitalize">{r.adjustment_type}</TableCell>
                  <TableCell className={`text-right font-semibold ${Number(r.quantity) < 0 ? "text-destructive" : "text-emerald-600"}`}>{Number(r.quantity) > 0 ? "+" : ""}{r.quantity}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.reason ?? "—"}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}