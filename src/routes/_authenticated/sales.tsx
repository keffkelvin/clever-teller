import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import { toast } from "sonner";

type Sale = {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  payment_method: string;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
};
type SaleItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales — Shop POS" }] }),
  component: SalesPage,
});

function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return toast.error(error.message);
      setSales((data ?? []) as Sale[]);
    })();
  }, []);

  const open = async (sale: Sale) => {
    setSelected(sale);
    const { data } = await supabase
      .from("sale_items")
      .select("id,product_name,quantity,unit_price,line_total")
      .eq("sale_id", sale.id);
    setItems((data ?? []) as SaleItem[]);
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todaySales = sales.filter((s) => new Date(s.created_at) >= today);
  const todayRevenue = todaySales.reduce((s, x) => s + Number(x.total), 0);
  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sales</h1>
        <p className="text-sm text-muted-foreground">Transaction history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Today's revenue" value={`KSh ${todayRevenue.toFixed(2)}`} />
        <StatCard icon={ShoppingBag} label="Today's sales" value={String(todaySales.length)} />
        <StatCard icon={TrendingUp} label="All-time revenue" value={`KSh ${totalRevenue.toFixed(2)}`} />
      </div>

      <Card>
        <CardContent className="p-0">
          {sales.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No sales yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => open(s)}>
                    <TableCell className="font-medium">{new Date(s.created_at).toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{s.customer_name || "Walk-in"}</TableCell>
                    <TableCell><Badge variant="outline">{s.payment_method}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">KSh {Number(s.total).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <div>{new Date(selected.created_at).toLocaleString()}</div>
                {selected.customer_name && <div>Customer: {selected.customer_name}</div>}
                <div>Payment: {selected.payment_method}</div>
              </div>
              <div className="border-t border-b py-2 space-y-1">
                {items.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span>{i.product_name} × {i.quantity}</span>
                    <span>KSh {Number(i.line_total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>KSh {Number(selected.subtotal).toFixed(2)}</span></div>
                {Number(selected.discount) > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>− KSh {Number(selected.discount).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span>KSh {Number(selected.total).toFixed(2)}</span></div>
              </div>
              <Button className="w-full" onClick={() => window.print()}>Print</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}