import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Shop POS" }] }),
  component: ExpensesPage,
});

type Cat = { id: string; name: string };
type Expense = {
  id: string;
  category_name: string | null;
  reference_no: string | null;
  amount: number;
  payment_method: string;
  expense_date: string;
  note: string | null;
};

const PAYMENTS = ["cash", "mpesa", "card", "bank", "credit"];

function ExpensesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [rows, setRows] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [form, setForm] = useState({
    category_id: "",
    reference_no: "",
    amount: "",
    payment_method: "cash",
    expense_date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const load = async () => {
    const [c, e] = await Promise.all([
      supabase.from("expense_categories").select("id,name").order("name"),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(300),
    ]);
    setCats((c.data ?? []) as Cat[]);
    setRows((e.data ?? []) as Expense[]);
  };
  useEffect(() => { load(); }, []);

  const saveCat = async () => {
    if (!newCat.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("expense_categories").insert({ owner_id: u.user.id, name: newCat.trim() });
    if (error) return toast.error(error.message);
    setNewCat(""); setCatOpen(false); load();
  };

  const save = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error("Enter amount");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const cat = cats.find((c) => c.id === form.category_id);
    const { error } = await supabase.from("expenses").insert({
      owner_id: u.user.id,
      category_id: form.category_id || null,
      category_name: cat?.name ?? null,
      reference_no: form.reference_no || null,
      amount: amt,
      payment_method: form.payment_method,
      expense_date: form.expense_date,
      note: form.note || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Expense added");
    setOpen(false);
    setForm({ ...form, amount: "", reference_no: "", note: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  };

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const thisMonth = rows
    .filter((r) => r.expense_date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track shop running costs</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild><Button variant="outline">Categories</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Expense categories</DialogTitle></DialogHeader>
              <div className="flex gap-2">
                <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Rent" />
                <Button onClick={saveCat}>Add</Button>
              </div>
              <div className="space-y-1 mt-3">
                {cats.length === 0 && <p className="text-sm text-muted-foreground">No categories yet</p>}
                {cats.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                    <span>{c.name}</span>
                    <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={async () => { await supabase.from("expense_categories").delete().eq("id", c.id); load(); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add expense</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Amount (KSh)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
                <div><Label>Payment</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENTS.map((p) => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Reference</Label><Input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} /></div>
                <div className="col-span-2"><Label>Note</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">This month</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(thisMonth)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">All-time</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(total)}</CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No expenses recorded</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Reference</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.expense_date}</TableCell>
                    <TableCell>{r.category_name ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{r.reference_no ?? "—"}</TableCell>
                    <TableCell className="uppercase text-xs">{r.payment_method}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(r.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
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