import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { RoleGate } from "@/components/role-gate";

type Log = {
  id: string;
  entity: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/audit-log")({
  head: () => ({ meta: [{ title: "Audit Log — Photon POS" }] }),
  component: () => <RoleGate level="admin"><AuditLogPage /></RoleGate>,
});

function AuditLogPage() {
  const [rows, setRows] = useState<Log[]>([]);
  useEffect(() => {
    (async () => {
      const client = supabase as unknown as { from: (t: string) => { select: (q: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Log[] | null }> } } } };
      const { data } = await client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      setRows(data ?? []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Audit Log</h1><p className="text-sm text-muted-foreground">Sensitive changes across the system (last 500)</p></div>
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground"><ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>Nothing logged yet</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Entity</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{r.entity}</Badge></TableCell>
                    <TableCell className="font-medium">{r.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xl truncate">
                      {r.details ? JSON.stringify(r.details) : "—"}
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