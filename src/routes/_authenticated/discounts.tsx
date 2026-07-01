import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Percent } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

type Row = { id: string; name: string; discount_type: "percentage" | "fixed"; discount_amount: number; starts_at: string | null; ends_at: string | null; priority: number; is_active: boolean };

export const Route = createFileRoute("/_authenticated/discounts")({
  head: () => ({ meta: [{ title: "Discounts — Shop POS" }] }),
  component: () => <RoleGate level="manager"><DiscountsPage /></RoleGate>,
});

function DiscountsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const empty = { name: "", discount_type: "percentage" as "percentage" | "fixed", discount_amount: 0, priority: 0, starts_at: "", ends_at: "", is_active: true };
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data, error } = await sb.from("discounts").select("id,name,discount_type,discount_amount,starts_at,ends_at,priority,is_active").order("priority", { ascending: false });
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({ name: r.name, discount_type: r.discount_type, discount_amount: Number(r.discount_amount), priority: r.priority, starts_at: r.starts_at?.slice(0,16) ?? "", ends_at: r.ends_at?.slice(0,16) ?? "", is_active: r.is_active });
    setOpen(true);
  };
  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = { ...form, owner_id: u.user.id, starts_at: form.starts_at || null, ends_at: form.ends_at || null };
    const res = editing ? await sb.from("discounts").update(payload).eq("id", editing.id) : await sb.from("discounts").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); setOpen(false); load();
  };
  const remove = async (r: Row) => { if (!confirm(`Delete "${r.name}"?`)) return; const { error } = await sb.from("discounts").delete().eq("id", r.id); if (error) return toast.error(error.message); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Discounts</h1><p className="text-sm text-muted-foreground">Promo rules used at the register</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Edit discount" : "New discount"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as "percentage" | "fixed" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed (KSh)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Amount</Label><Input type="number" step="0.01" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
                <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Active</Label><p className="text-xs text-muted-foreground">Available at the register</p></div>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
              <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground"><Percent className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No discounts yet</p></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Window</TableHead><TableHead>Status</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground capitalize">{r.discount_type}</TableCell>
                <TableCell>{r.discount_type === "percentage" ? `${r.discount_amount}%` : formatMoney(r.discount_amount)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{r.starts_at ? new Date(r.starts_at).toLocaleDateString() : "any"} → {r.ends_at ? new Date(r.ends_at).toLocaleDateString() : "any"}</TableCell>
                <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Off"}</Badge></TableCell>
                <TableCell><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}