import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRoles, type AppRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — Shop POS" }] }),
  component: UsersPage,
});

type Row = { user_id: string; email: string | null; created_at: string; roles: AppRole[] };

function UsersPage() {
  const { isAdmin, loading } = useRoles();
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<string | null>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? null);
    const { data, error } = await (supabase as unknown as { rpc: (n: string) => Promise<{ data: Row[] | null; error: { message: string } | null }> })
      .rpc("list_users_with_roles");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  const removeUserRoles = async (userId: string) => {
    if (!confirm("Remove all roles for this user (revoke access)?")) return;
    await supabase.from("user_roles").delete().eq("user_id", userId);
    load();
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!isAdmin) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Admin access required.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage staff roles. New sign-ups default to <b>cashier</b>.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Change role</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell>
                    <div className="font-medium">{r.email ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{r.user_id.slice(0, 8)}… {r.user_id === me && <Badge variant="outline" className="ml-1">you</Badge>}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-KE")}</TableCell>
                  <TableCell>{r.roles.length === 0 ? <Badge variant="outline">none</Badge> : r.roles.map((role) => <Badge key={role} className="mr-1 capitalize">{role}</Badge>)}</TableCell>
                  <TableCell>
                    <Select value={r.roles[0] ?? ""} onValueChange={(v) => changeRole(r.user_id, v as AppRole)} disabled={r.user_id === me}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" disabled={r.user_id === me} onClick={() => removeUserRoles(r.user_id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Tip: to invite a new staff member, share your sign-up link. They will appear here after their first sign-in and you can change their role.
      </p>
    </div>
  );
}