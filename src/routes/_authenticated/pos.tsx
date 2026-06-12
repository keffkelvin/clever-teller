import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Trash2, Search, X, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
};

type CartLine = {
  product: Product;
  qty: number;
};

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({ meta: [{ title: "Register — Shop POS" }] }),
  component: PosPage,
});

function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,sku,category,price,stock,image_url")
      .order("name");
    if (error) return toast.error(error.message);
    setProducts((data ?? []) as Product[]);
  };

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => {
    const s = new Set(products.map((p) => p.category));
    return ["all", ...Array.from(s).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (q === "" ||
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q)),
    );
  }, [products, search, category]);

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return toast.error(`${p.name} is out of stock`);
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        if (existing.qty + 1 > p.stock) {
          toast.error(`Only ${p.stock} in stock`);
          return prev;
        }
        return prev.map((l) =>
          l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.product.id !== id) return l;
          const next = l.qty + delta;
          if (next > l.product.stock) {
            toast.error(`Only ${l.product.stock} in stock`);
            return l;
          }
          return { ...l, qty: next };
        })
        .filter((l) => l.qty > 0),
    );
  };

  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.product.id !== id));

  const subtotal = cart.reduce((s, l) => s + l.qty * Number(l.product.price), 0);
  const total = Math.max(0, subtotal - discount);

  const checkout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) {
      setProcessing(false);
      return toast.error("Not signed in");
    }
    const { data: sale, error } = await supabase
      .from("sales")
      .insert({
        owner_id: user.id,
        subtotal,
        discount,
        tax: 0,
        total,
        payment_method: payment,
        customer_name: customer || null,
      })
      .select()
      .single();
    if (error || !sale) {
      setProcessing(false);
      return toast.error(error?.message ?? "Sale failed");
    }
    const items = cart.map((l) => ({
      sale_id: sale.id,
      owner_id: user.id,
      product_id: l.product.id,
      product_name: l.product.name,
      unit_price: l.product.price,
      quantity: l.qty,
      line_total: l.qty * Number(l.product.price),
    }));
    const { error: itemsErr } = await supabase.from("sale_items").insert(items);
    if (itemsErr) {
      setProcessing(false);
      return toast.error(itemsErr.message);
    }
    // Decrement stock (RLS-scoped)
    await Promise.all(
      cart.map((l) =>
        supabase
          .from("products")
          .update({ stock: Math.max(0, l.product.stock - l.qty) })
          .eq("id", l.product.id),
      ),
    );
    toast.success(`Sale complete — KSh ${total.toFixed(2)}`);
    setCart([]);
    setCustomer("");
    setDiscount(0);
    setPayment("cash");
    setProcessing(false);
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/* Products */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No products yet.</p>
              <p className="text-sm">Add some in the Inventory tab.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className={cn(
                  "text-left rounded-lg border bg-card p-3 transition-all hover:border-primary hover:shadow-md",
                  p.stock <= 0 && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="aspect-square rounded-md bg-muted mb-2 flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="font-medium text-sm line-clamp-2">{p.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-semibold">KSh {Number(p.price).toFixed(2)}</span>
                  <Badge variant={p.stock <= 0 ? "destructive" : p.stock < 5 ? "secondary" : "outline"} className="text-xs">
                    {p.stock}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart */}
      <Card className="lg:sticky lg:top-20 h-fit">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Current Sale</CardTitle>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCart([])}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Tap a product to add it
            </p>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {cart.map((l) => (
                <div key={l.product.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{l.product.name}</div>
                    <div className="text-muted-foreground text-xs">
                      KSh {Number(l.product.price).toFixed(2)} × {l.qty}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.product.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-medium">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.product.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.product.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t">
            <Input
              placeholder="Customer name (optional)"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Discount"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>KSh {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>− KSh {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>Total</span>
              <span>KSh {total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={cart.length === 0 || processing}
            onClick={checkout}
          >
            {processing ? "Processing…" : `Charge KSh ${total.toFixed(2)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}