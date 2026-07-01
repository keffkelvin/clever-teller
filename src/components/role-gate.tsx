import type { ReactNode } from "react";
import { useRoles } from "@/hooks/use-role";
import { ShieldAlert } from "lucide-react";

type Level = "admin" | "manager";

export function RoleGate({ level, children }: { level: Level; children: ReactNode }) {
  const { isAdmin, isManager, loading } = useRoles();
  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  const allowed = level === "admin" ? isAdmin : isManager;
  if (!allowed) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="font-medium">{level === "admin" ? "Admin" : "Manager or admin"} access required.</p>
        <p className="text-sm">Ask your administrator to grant you the right role.</p>
      </div>
    );
  }
  return <>{children}</>;
}