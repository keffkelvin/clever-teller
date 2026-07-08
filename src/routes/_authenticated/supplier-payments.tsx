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
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

type Supplier = { id: string; name: string };
type Purchase = { id: string; reference_no: string | null; total: number; amount_paid: number; supplier_id: string | null };
type Payment = {
  id: string;
  amount: number;
  payment_method: string;
  reference_no: string | null;
  paid_at: string;
  supplier_id: string | null;
  purchase_id: string | null;
  notes: string | null;
};

export const Route = createFileRoute("/_authenticated/supplier-payments")({
  head: () => ({ meta: [{ title: "Supplier Payments — Photon POS" }] }),
  component: SupplierPaymentsPage,
});

function SupplierPaymentsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    purchase_id: "",
    amount: "0",
    payment_method: "cash",
    reference_no: "",
    notes: "",
  });

  const load = async () => {
    const client = supabase as unknown as { from: (t: string) => { select: (q: string) => { order: (c: string, o?: { ascending: boolean }) => Promise<{ data: unknown }> } } };
    const [s, p, pay] = await Promise.all([
      supabase.from("suppliers").select("id,name").order("name"),
      supabase.from("purchases").select("id,reference_no,total,amount_paid,supplier_id").order("created_at", { ascending: false }),
      client.from("supplier_payments").select("*").order("paid_at", { ascending: false }),
    ]);
    setSuppliers((s.data ?? []) as Supplier[]);
    setPurchases((p.data ?? []) as Purchase[]);
    setPayments((pay.data ?? []) as Payment[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const amount = Number(form.amount);
    if (!form.supplier_id || !amount || amount <= 0) return toast.error("Pick supplier and amount");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const client = supabase as unknown as { from: (t: string) => { insert: (r: Record<string, unknown>) => Promise<{ error: { message: string } | null }> } };
    const { error } = await client.from("supplier_payments").insert({
      owner_id: u.user.id,
      supplier_id: form.supplier_id,
      purchase_id: form.purchase_id || null,
      amount,
      payment_method: form.payment_method,
      reference_no: form.reference_no || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    if (form.purchase_id) {
      const pu = purchases.find((x) => x.id === form.purchase_id);
      if (pu) {
        const newPaid = Number(pu.amount_paid) + amount;
        const status = newPaid >= Number(pu.total) ? "paid" : "partial";
        await supabase.from("purchases").update({ amount_paid: newPaid, payment_status: status }).eq("id", pu.id);
      }
    }
    toast.success("Payment recorded");
    setOpen(false);
    setForm({ supplier_id: "", purchase_id: "", amount: "0", payment_method: "cash", reference_no: "", notes: "" });
    load();
  };

  const supMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  const filteredPurchases = purchases.filter((p) => !form.supplier_id || p.supplier_id === form.supplier_id);
  const outstanding = purchases
    .filter((p) => Number(p.total) - Number(p.amount_paid) > 0.001)
    .reduce((s, p) => s + (Number(p.total) - Number(p.amount_paid)), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Supplier Payments</h1>
          <p className="text-sm text-muted-foreground">
            Outstanding to suppliers: <span className="font-semibold text-destructive">{formatMoney(outstanding)}</span>
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Record Payment</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record supplier payment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Supplier *</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v, purchase_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Against purchase (optional)</Label>
                <Select value={form.purchase_id} onValueChange={(v) => setForm({ ...form, purchase_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Any / general" /></SelectTrigger>
                  <SelectContent>
                    {filteredPurchases.map((p) => {
                      const due = Number(p.total) - Number(p.amount_paid);
                      return <SelectItem key={p.id} value={p.id}>{p.reference_no ?? p.id.slice(0, 6)} · Due {formatMoney(due)}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div>
                  <Label>Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reference</Label><Input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground"><Wallet className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No supplier payments yet</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.paid_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{p.supplier_id ? supMap[p.supplier_id] ?? "—" : "—"}</TableCell>
                    <TableCell className="uppercase text-xs">{p.payment_method}</TableCell>
                    <TableCell className="text-muted-foreground">{p.reference_no ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}