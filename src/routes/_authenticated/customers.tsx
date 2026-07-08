import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

type Customer = { id: string; name: string; phone: string | null; email: string | null; address: string | null; opening_balance: number; notes: string | null; loyalty_points?: number };

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — Photon POS" }] }),
  component: CustomersPage,
});

const empty = { name: "", phone: "", email: "", address: "", opening_balance: 0, notes: "" };

function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const load = async () => {
    const [{ data, error }, { data: due }] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      (supabase as unknown as { from: (t: string) => { select: (q: string) => { in: (k: string, v: string[]) => Promise<{ data: { customer_id: string | null; total: number; amount_paid: number | null }[] | null }> } } })
        .from("sales").select("customer_id,total,amount_paid").in("payment_status", ["credit", "partial", "due"]),
    ]);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Customer[]);
    const bal: Record<string, number> = {};
    for (const s of (due ?? [])) {
      if (!s.customer_id) continue;
      bal[s.customer_id] = (bal[s.customer_id] ?? 0) + (Number(s.total) - Number(s.amount_paid ?? 0));
    }
    setBalances(bal);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "", opening_balance: Number(c.opening_balance), notes: c.notes ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = { ...form, phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null, owner_id: u.user.id };
    const res = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Updated" : "Customer added");
    setOpen(false); load();
  };

  const remove = async (c: Customer) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = rows.filter((r) => q === "" || r.name.toLowerCase().includes(q.toLowerCase()) || (r.phone ?? "").includes(q));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Customers</h1><p className="text-sm text-muted-foreground">{rows.length} contacts</p></div>
        <div className="flex gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXX" /></div>
                  <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div><Label>Opening balance (KSh)</Label><Input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: Number(e.target.value) })} /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save" : "Add"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No customers yet</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Phone</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead className="text-right">Points</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const bal = Number(c.opening_balance) + (balances[c.id] ?? 0);
                  return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-right">{Number(c.loyalty_points ?? 0)}</TableCell>
                    <TableCell className={`text-right ${bal > 0 ? "text-destructive font-medium" : ""}`}>{formatMoney(bal)}</TableCell>
                    <TableCell><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}