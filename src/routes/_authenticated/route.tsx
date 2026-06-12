import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, ShoppingCart, Package, Receipt, Users, Truck, ShoppingBag,
  Tags, Bookmark, Ruler, Settings as SettingsIcon, LogOut, Zap, Menu, X, ChevronRight, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; icon: React.ComponentType<{ className?: string }>; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Contacts",
    icon: Users,
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    label: "Products",
    icon: Package,
    items: [
      { to: "/products", label: "Inventory", icon: Package },
      { to: "/categories", label: "Categories", icon: Tags },
      { to: "/brands", label: "Brands", icon: Bookmark },
      { to: "/units", label: "Units", icon: Ruler },
    ],
  },
  {
    label: "Purchases",
    icon: ShoppingBag,
    items: [{ to: "/purchases", label: "Purchases", icon: ShoppingBag }],
  },
];

const topLevel: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "Register", icon: ShoppingCart },
  { to: "/sales", label: "Sales", icon: Receipt },
];

function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform top-0 h-screen",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="h-14 px-4 flex items-center gap-2 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <Zap className="h-4 w-4" />
          </div>
          <span className="font-semibold truncate">Photon POS</span>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden h-8 w-8" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {topLevel.map((item) => (
            <NavLink key={item.to} item={item} active={location.pathname === item.to} onClick={() => setMobileOpen(false)} />
          ))}
          {groups.map((g) => (
            <NavGroupBlock key={g.label} group={g} pathname={location.pathname} onItemClick={() => setMobileOpen(false)} />
          ))}
          <Link
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 h-9 rounded-md text-sm font-medium transition-colors",
              location.pathname === "/settings" ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent",
            )}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background sticky top-0 z-20 flex items-center px-4 gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/pos"><ShoppingCart className="h-4 w-4" /> New Sale</Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 h-9 rounded-md text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

function NavGroupBlock({ group, pathname, onItemClick }: { group: NavGroup; pathname: string; onItemClick?: () => void }) {
  const hasActive = group.items.some((i) => pathname === i.to);
  const [open, setOpen] = useState(hasActive);
  const Icon = group.icon;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 h-9 rounded-md text-sm font-medium hover:bg-sidebar-accent transition-colors"
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left">{group.label}</span>
        {open ? <ChevronDown className="h-4 w-4 opacity-60" /> : <ChevronRight className="h-4 w-4 opacity-60" />}
      </button>
      {open && (
        <div className="ml-7 mt-1 space-y-1 border-l border-sidebar-border pl-2">
          {group.items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-2 px-3 h-8 rounded-md text-sm transition-colors",
                pathname === i.to ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground/80",
              )}
            >
              <span>{i.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}