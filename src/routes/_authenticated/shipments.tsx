import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/shipments")({
  head: () => ({ meta: [{ title: "Shipments — Shop POS" }] }),
  component: ShipmentsPage,
});

type Row = {
  id: string;
  invoice_no: string | null;
  customer_name: string | null;
  contact_number: string | null;
  total: number;
  shipping_status: string | null;
  shipping_address: string | null;
  delivery_person: string | null;
  shipping_charges: number | null;
  created_at: string;
};

const STATUSES = ["pending", "packed", "shipped", "delivered", "cancelled"] as const;

function ShipmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    const sb = supabase as unknown as { from: (t: string) => { select: (q: string) => { not: (k: string, op: string, v: unknown) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null; error: { message: string } | null }> } } } };
    const { data, error } = await sb.from("sales").select("id,invoice_no,customer_name,contact_number,total,shipping_status,shipping_address,delivery_person,shipping_charges,created_at").not("shipping_address", "is", null).order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    const sb = supabase as unknown as { from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> } } };
    const { error } = await sb.from("sales").update({ shipping_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    load();
  };

  const updateDriver = async (id: string, delivery_person: string) => {
    const sb = supabase as unknown as { from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> } } };
    const { error } = await sb.from("sales").update({ delivery_person }).eq("id", id);
    if (error) return toast.error(error.message);
  };

  const filtered = rows.filter((r) => {
    if (filter !== "all" && (r.shipping_status ?? "pending") !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.invoice_no ?? "").toLowerCase().includes(q) || (r.customer_name ?? "").toLowerCase().includes(q) || (r.shipping_address ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const statusVariant = (s: string | null) => {
    switch (s) {
      case "delivered": return "default";
      case "shipped": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Shipments</h1>
          <p className="text-sm text-muted-foreground">Track and update delivery status for sales with shipping</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input placeholder="Search invoice, customer, address…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-muted-foreground self-center">{filtered.length} shipment{filtered.length === 1 ? "" : "s"}</div>
        </CardContent>
      </Card>
      <Card><CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Truck className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No shipments yet — add a shipping address on a sale in the POS to track it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Address</TableHead>
                <TableHead>Driver</TableHead><TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead><TableHead>Update</TableHead>
              </TableRow></TableHeader>
              <TableBody>{filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.invoice_no ?? r.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.customer_name ?? "Walk-in"}</div>
                    <div className="text-xs text-muted-foreground">{r.contact_number ?? "—"}</div>
                  </TableCell>
                  <TableCell className="max-w-xs"><div className="text-sm truncate" title={r.shipping_address ?? ""}>{r.shipping_address}</div></TableCell>
                  <TableCell>
                    <Input defaultValue={r.delivery_person ?? ""} className="h-8 w-32" placeholder="Driver"
                      onBlur={(e) => { if (e.target.value !== (r.delivery_person ?? "")) updateDriver(r.id, e.target.value); }} />
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(Number(r.total) + Number(r.shipping_charges ?? 0))}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.shipping_status)}>{r.shipping_status ?? "pending"}</Badge></TableCell>
                  <TableCell>
                    <Select value={r.shipping_status ?? "pending"} onValueChange={(v) => update(r.id, v)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>
      <Button variant="outline" onClick={load}>Refresh</Button>
    </div>
  );
}