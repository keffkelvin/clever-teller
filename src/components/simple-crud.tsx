import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Field = { key: string; label: string; required?: boolean };
type Column = { key: string; label: string; muted?: boolean; className?: string };

type Row = Record<string, unknown> & { id: string };

export function SimpleCrud({
  table, title, subtitle, fields, columns,
}: { table: "categories" | "brands" | "units"; title: string; subtitle?: string; fields: Field[]; columns: Column[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, ""])));

  const load = async () => {
    const { data, error } = await supabase.from(table).select("*").order("name");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, [table]);

  const openNew = () => { setEditing(null); setForm(Object.fromEntries(fields.map((f) => [f.key, ""]))); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm(Object.fromEntries(fields.map((f) => [f.key, String(r[f.key] ?? "")])));
    setOpen(true);
  };

  const save = async () => {
    for (const f of fields) if (f.required && !form[f.key]?.trim()) return toast.error(`${f.label} required`);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload: Record<string, unknown> = { owner_id: u.user.id };
    for (const f of fields) payload[f.key] = form[f.key] || null;
    const res = editing
      ? await supabase.from(table).update(payload).eq("id", editing.id)
      : await supabase.from(table).insert(payload as never);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Updated" : "Added");
    setOpen(false); load();
  };

  const remove = async (r: Row) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from(table).delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">{title}</h1>{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}{f.required ? " *" : ""}</Label>
                  <Input value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save" : "Add"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground"><p>Nothing yet — add your first one.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow>{columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}<TableHead className="w-20"></TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((r) => (
                <TableRow key={r.id}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(c.className, c.muted && "text-muted-foreground")}>
                      {String(r[c.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}