import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

type Supplier = { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null; address: string | null; opening_balance: number; notes: string | null };

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — Photon POS" }] }),
  component: SuppliersPage,
});

const empty = { name: "", contact_person: "", phone: "", email: "", address: "", opening_balance: 0, notes: "" };

function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("suppliers").select("*").order("name");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Supplier[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contact_person: s.contact_person ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", opening_balance: Number(s.opening_balance), notes: s.notes ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = { ...form, contact_person: form.contact_person || null, phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null, owner_id: u.user.id };
    const res = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Updated" : "Supplier added");
    setOpen(false); load();
  };

  const remove = async (s: Supplier) => {
    if (!confirm(`Delete ${s.name}?`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = rows.filter((r) => q === "" || r.name.toLowerCase().includes(q.toLowerCase()) || (r.phone ?? "").includes(q));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Suppliers</h1><p className="text-sm text-muted-foreground">{rows.length} suppliers</p></div>
        <div className="flex gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editing ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Business name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Contact person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
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
            <div className="py-16 text-center text-muted-foreground"><Truck className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No suppliers yet</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Contact</TableHead><TableHead className="hidden md:table-cell">Phone</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{s.contact_person || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{s.phone || "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(s.opening_balance)}</TableCell>
                    <TableCell><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(s)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
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