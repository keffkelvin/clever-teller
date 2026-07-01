import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({ meta: [{ title: "Purchases — Photon POS" }] }),
  component: PurchasesPage,
});

type Purchase = { id: string; reference_no: string | null; purchase_date: string; total: number; amount_paid: number; payment_status: string; supplier_id: string | null };
type Supplier = { id: string; name: string };
type Product = { id: string; name: string; cost: number; stock: number };
type Line = { product_id: string; product_name: string; unit_cost: number; quantity: number };

function PurchasesPage() {
  const [rows, setRows] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>("");
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState("cash");
  const [paid, setPaid] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState("");

  const load = async () => {
    const { data } = await supabase.from("purchases").select("id,reference_no,purchase_date,total,amount_paid,payment_status,supplier_id").order("purchase_date", { ascending: false });
    setRows((data ?? []) as Purchase[]);
  };
  useEffect(() => {
    load();
    supabase.from("suppliers").select("id,name").order("name").then(({ data }) => setSuppliers((data ?? []) as Supplier[]));
    supabase.from("products").select("id,name,cost,stock").order("name").then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  const addLine = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    if (lines.find((l) => l.product_id === id)) return;
    setLines([...lines, { product_id: p.id, product_name: p.name, unit_cost: Number(p.cost) || 0, quantity: 1 }]);
    setPick("");
  };
  const subtotal = lines.reduce((s, l) => s + l.unit_cost * l.quantity, 0);

  const save = async () => {
    if (lines.length === 0) return toast.error("Add at least one item");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const total = subtotal;
    const status = paid >= total ? "paid" : paid > 0 ? "partial" : "due";
    const { data: purchase, error } = await supabase.from("purchases").insert({
      owner_id: u.user.id, supplier_id: supplierId || null, reference_no: reference || null,
      subtotal: total, total, amount_paid: paid, payment_status: status, payment_method: payment,
    }).select().single();
    if (error || !purchase) return toast.error(error?.message ?? "Failed");
    const items = lines.map((l) => ({
      owner_id: u.user.id, purchase_id: purchase.id, product_id: l.product_id, product_name: l.product_name,
      unit_cost: l.unit_cost, quantity: l.quantity, line_total: l.unit_cost * l.quantity,
    }));
    await supabase.from("purchase_items").insert(items);
    // Atomic stock bump via RPC — safe under concurrent purchases/sales
    await Promise.all(lines.map((l) =>
      (supabase as unknown as { rpc: (n: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }> })
        .rpc("increment_stock", { p_product_id: l.product_id, p_quantity: l.quantity }),
    ));
    toast.success("Purchase recorded");
    setOpen(false); setLines([]); setSupplierId(""); setReference(""); setPaid(0); setPayment("cash");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Purchases</h1><p className="text-sm text-muted-foreground">Stock received from suppliers</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New Purchase</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Purchase</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Supplier</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {suppliers.length === 0 && <p className="text-xs text-muted-foreground mt-1"><Link to="/suppliers" className="underline">Add suppliers first</Link></p>}
                </div>
                <div><Label>Reference #</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Invoice no." /></div>
              </div>

              <div>
                <Label>Add product</Label>
                <Select value={pick} onValueChange={addLine}>
                  <SelectTrigger><SelectValue placeholder="Search products…" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="w-24">Qty</TableHead><TableHead className="w-32">Unit cost</TableHead><TableHead className="w-32 text-right">Total</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {lines.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">No items</TableCell></TableRow> :
                      lines.map((l, idx) => (
                        <TableRow key={l.product_id}>
                          <TableCell className="font-medium">{l.product_name}</TableCell>
                          <TableCell><Input type="number" min={1} value={l.quantity} onChange={(e) => { const n = [...lines]; n[idx].quantity = Number(e.target.value); setLines(n); }} /></TableCell>
                          <TableCell><Input type="number" step="0.01" value={l.unit_cost} onChange={(e) => { const n = [...lines]; n[idx].unit_cost = Number(e.target.value); setLines(n); }} /></TableCell>
                          <TableCell className="text-right">{formatMoney(l.unit_cost * l.quantity)}</TableCell>
                          <TableCell><Button size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <Label>Payment method</Label>
                  <Select value={payment} onValueChange={setPayment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Amount paid</Label><Input type="number" step="0.01" value={paid} onChange={(e) => setPaid(Number(e.target.value))} /></div>
                <div className="text-right"><div className="text-xs text-muted-foreground">Total</div><div className="text-xl font-bold">{formatMoney(subtotal)}</div></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save Purchase</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground"><ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No purchases yet</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.purchase_date).toLocaleDateString("en-KE")}</TableCell>
                  <TableCell className="text-muted-foreground">{p.reference_no || "—"}</TableCell>
                  <TableCell><Badge variant={p.payment_status === "paid" ? "default" : p.payment_status === "partial" ? "secondary" : "destructive"}>{p.payment_status}</Badge></TableCell>
                  <TableCell className="text-right">{formatMoney(p.amount_paid)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(p.total)}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}