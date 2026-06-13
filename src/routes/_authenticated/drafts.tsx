import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

type Row = { id: string; reference_no: string | null; customer_name: string | null; contact_number: string | null; total: number; created_at: string };

export const Route = createFileRoute("/_authenticated/drafts")({
  head: () => ({ meta: [{ title: "Drafts — Shop POS" }] }),
  component: () => <DraftsList type="draft" title="Drafts" subtitle="Held sales — recall in the POS register" />,
});

export function DraftsList({ type, title, subtitle }: { type: "draft" | "quotation"; title: string; subtitle: string }) {
  const sb = supabase as unknown as { from: (t: string) => { select: (q: string) => { eq: (k: string, v: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null; error: { message: string } | null }> } }; delete: () => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> } } };
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => {
    const { data, error } = await sb.from("drafts").select("id,reference_no,customer_name,contact_number,total,created_at").eq("draft_type", type).order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type]);
  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await sb.from("drafts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">{title}</h1><p className="text-sm text-muted-foreground">{subtitle}</p></div>
        <Button asChild><Link to="/pos">Open POS</Link></Button>
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No {title.toLowerCase()} yet</p></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.created_at).toLocaleString("en-KE")}</TableCell>
                <TableCell>{r.customer_name ?? "Walk-in"}</TableCell>
                <TableCell className="text-muted-foreground">{r.contact_number ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(r.total)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}