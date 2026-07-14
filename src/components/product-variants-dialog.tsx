import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

type Variant = {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  low_stock_threshold: number;
};

const empty = {
  name: "",
  sku: "",
  barcode: "",
  price: 0,
  cost: 0,
  stock: 0,
  low_stock_threshold: 5,
};

export function ProductVariantsDialog({
  open, onOpenChange, productId, productName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productId: string | null;
  productName: string;
}) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!productId) return;
    const { data, error } = await supabase
      .from("product_variants").select("*")
      .eq("product_id", productId).order("name");
    if (error) return toast.error(error.message);
    setVariants((data ?? []) as Variant[]);
  };

  useEffect(() => { if (open) { setForm(empty); load(); } /* eslint-disable-next-line */ }, [open, productId]);

  const add = async () => {
    if (!productId) return;
    if (!form.name.trim()) return toast.error("Variant name required");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    setLoading(true);
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      owner_id: u.user.id,
      name: form.name.trim(),
      sku: form.sku || null,
      barcode: form.barcode || null,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 5,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Variant added");
    setForm(empty);
    load();
  };

  const remove = async (v: Variant) => {
    if (!confirm(`Delete variant "${v.name}"?`)) return;
    const { error } = await supabase.from("product_variants").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Variants — {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 space-y-3">
            <div className="text-sm font-medium">Add variant</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div><Label className="text-xs">Name (e.g. Red / L)</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label className="text-xs">SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label className="text-xs">Barcode</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
              <div><Label className="text-xs">Stock</Label>
                <Input type="number" value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Price</Label>
                <Input type="number" step="0.01" value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Cost</Label>
                <Input type="number" step="0.01" value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Low-stock alert</Label>
                <Input type="number" value={form.low_stock_threshold}
                  onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} /></div>
              <div className="flex items-end">
                <Button onClick={add} disabled={loading} className="w-full">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </div>

          {variants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No variants yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-muted-foreground">{v.sku || "—"}</TableCell>
                    <TableCell className="text-right">KSh {Number(v.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={v.stock <= 0 ? "destructive" : v.stock <= v.low_stock_threshold ? "secondary" : "outline"}>
                        {v.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(v)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}