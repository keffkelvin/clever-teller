import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { useRef } from "react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string;
  price: number;
  cost: number;
  stock: number;
  low_stock_threshold: number;
  image_url: string | null;
  brand_id: string | null;
  unit_id: string | null;
};

const empty: Omit<Product, "id"> = {
  name: "",
  sku: "",
  barcode: "",
  category: "general",
  price: 0,
  cost: 0,
  stock: 0,
  low_stock_threshold: 5,
  image_url: "",
  brand_id: null,
  unit_id: null,
};

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Inventory — Shop POS" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["general"]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string; short_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [{ data, error }, { data: cats }, { data: br }, { data: un }] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("categories").select("name").order("name"),
      supabase.from("brands").select("id,name").order("name"),
      supabase.from("units").select("id,name,short_name").order("name"),
    ]);
    if (error) return toast.error(error.message);
    setProducts((data ?? []) as Product[]);
    const list = ((cats ?? []) as { name: string }[]).map((c) => c.name);
    setCategories(list.length ? list : ["general"]);
    setBrands((br ?? []) as { id: string; name: string }[]);
    setUnits((un ?? []) as { id: string; name: string; short_name: string }[]);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku ?? "", barcode: p.barcode ?? "",
      category: p.category, price: Number(p.price), cost: Number(p.cost),
      stock: p.stock, low_stock_threshold: p.low_stock_threshold,
      image_url: p.image_url ?? "",
      brand_id: p.brand_id ?? null,
      unit_id: p.unit_id ?? null,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return toast.error("Not signed in");
    const payload = {
      ...form,
      sku: form.sku || null,
      barcode: form.barcode || null,
      image_url: form.image_url || null,
      brand_id: form.brand_id || null,
      unit_id: form.unit_id || null,
      owner_id: userRes.user.id,
    };
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      if (Number(editing.price) !== Number(form.price)) {
        await logAudit("product", editing.id, "price_change", {
          name: form.name, from: Number(editing.price), to: Number(form.price),
        });
      }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Product added");
    }
    setOpen(false);
    load();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await logAudit("product", p.id, "delete", { name: p.name });
    toast.success("Deleted");
    load();
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return toast.error("Empty file");
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const name = (cols[idx("name")] ?? "").trim();
      if (!name) continue;
      rows.push({
        owner_id: u.user.id,
        name,
        sku: (cols[idx("sku")] ?? "").trim() || null,
        barcode: (cols[idx("barcode")] ?? "").trim() || null,
        category: (cols[idx("category")] ?? "general").trim() || "general",
        price: Number(cols[idx("price")] ?? 0) || 0,
        cost: Number(cols[idx("cost")] ?? 0) || 0,
        stock: Number(cols[idx("stock")] ?? 0) || 0,
        low_stock_threshold: Number(cols[idx("low_stock_threshold")] ?? 5) || 5,
      });
    }
    if (!rows.length) return toast.error("No valid rows");
    const { error } = await supabase.from("products").insert(rows as never);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${rows.length} products`);
    load();
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return q === "" || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} title="Import CSV: name,sku,barcode,category,price,cost,stock,low_stock_threshold">
            Import CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4" /> Add</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>SKU</Label><Input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                  <div><Label>Barcode</Label><Input value={form.barcode ?? ""} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Brand</Label>
                    <Select value={form.brand_id ?? "none"} onValueChange={(v) => setForm({ ...form, brand_id: v === "none" ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={form.unit_id ?? "none"} onValueChange={(v) => setForm({ ...form, unit_id: v === "none" ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.short_name})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Price (KSh )</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                  <div><Label>Cost (KSh )</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
                  <div><Label>Low-stock alert</Label><Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} /></div>
                </div>
                <div><Label>Image URL (optional)</Label><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>{editing ? "Save" : "Add product"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No products yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">SKU</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{p.category}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{p.sku || "—"}</TableCell>
                    <TableCell className="text-right">KSh {Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.stock <= 0 ? "destructive" : p.stock <= p.low_stock_threshold ? "secondary" : "outline"}>
                        {p.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
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