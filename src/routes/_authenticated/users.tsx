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

type Row = { user_id: string; role: AppRole; id: string };

function UsersPage() {
  const { isAdmin, loading } = useRoles();
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<string | null>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? null);
    const { data, error } = await supabase.from("user_roles").select("id,user_id,role");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const grouped: Record<string, AppRole[]> = {};
  rows.forEach((r) => {
    grouped[r.user_id] = grouped[r.user_id] ?? [];
    grouped[r.user_id].push(r.role);
  });

  const changeRole = async (userId: string, newRole: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
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
              <TableHead>User ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Change role</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Object.entries(grouped).map(([uid, roles]) => (
                <TableRow key={uid}>
                  <TableCell className="font-mono text-xs">{uid.slice(0, 8)}… {uid === me && <Badge variant="outline" className="ml-1">you</Badge>}</TableCell>
                  <TableCell>{roles.map((r) => <Badge key={r} className="mr-1 capitalize">{r}</Badge>)}</TableCell>
                  <TableCell>
                    <Select value={roles[0]} onValueChange={(v) => changeRole(uid, v as AppRole)} disabled={uid === me}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" disabled={uid === me} onClick={() => removeUserRoles(uid)}><Trash2 className="h-3 w-3" /></Button>
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