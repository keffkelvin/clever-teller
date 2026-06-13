import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { Wallet } from "lucide-react";

type Reg = { id: string; opening_cash: number; opened_at: string; closing_cash: number | null; closed_at: string | null; status: string };

export const Route = createFileRoute("/_authenticated/cash-register")({
  head: () => ({ meta: [{ title: "Cash Register — Shop POS" }] }),
  component: CashRegisterPage,
});

function CashRegisterPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [current, setCurrent] = useState<Reg | null>(null);
  const [history, setHistory] = useState<Reg[]>([]);
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [salesTotal, setSalesTotal] = useState(0);

  const load = async () => {
    const { data: cur } = await sb.from("cash_registers").select("id,opening_cash,opened_at,closing_cash,closed_at,status").eq("status", "open").order("opened_at", { ascending: false }).maybeSingle();
    setCurrent(cur ?? null);
    const { data: h } = await sb.from("cash_registers").select("id,opening_cash,opened_at,closing_cash,closed_at,status").eq("status", "closed").order("opened_at", { ascending: false }).limit(10);
    setHistory(h ?? []);
    if (cur) {
      const { data: s } = await sb.from("sales").select("amount_paid").eq("payment_method", "cash").gte("created_at", cur.opened_at);
      setSalesTotal(((s ?? []) as { amount_paid: number }[]).reduce((sum: number, x: { amount_paid: number }) => sum + Number(x.amount_paid || 0), 0));
    }
  };
  useEffect(() => { load(); }, []);

  const openReg = async () => {
    const amt = Number(opening) || 0;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await sb.from("cash_registers").insert({ owner_id: u.user.id, opening_cash: amt });
    if (error) return toast.error(error.message);
    toast.success("Register opened"); setOpening(""); load();
  };
  const closeReg = async () => {
    if (!current) return;
    const amt = Number(closing) || 0;
    const { error } = await sb.from("cash_registers").update({ closing_cash: amt, closed_at: new Date().toISOString(), status: "closed" }).eq("id", current.id);
    if (error) return toast.error(error.message);
    toast.success("Register closed"); setClosing(""); load();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div><h1 className="text-2xl font-bold">Cash Register</h1><p className="text-sm text-muted-foreground">Open a till session and reconcile at end of day</p></div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" /> {current ? "Current session" : "Open register"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {current ? (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="Opened" value={new Date(current.opened_at).toLocaleString("en-KE")} />
                <Stat label="Opening cash" value={formatMoney(current.opening_cash)} />
                <Stat label="Cash sales since open" value={formatMoney(salesTotal)} />
              </div>
              <div className="border-t pt-3">
                <Label>Closing cash (count drawer)</Label>
                <Input type="number" step="0.01" value={closing} onChange={(e) => setClosing(e.target.value)} />
                <div className="text-xs text-muted-foreground mt-1">Expected: {formatMoney(Number(current.opening_cash) + salesTotal)}</div>
              </div>
              <Button onClick={closeReg}>Close register</Button>
            </>
          ) : (
            <>
              <Label>Cash in hand</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={opening} onChange={(e) => setOpening(e.target.value)} />
              <Button onClick={openReg}>Open register</Button>
            </>
          )}
        </CardContent>
      </Card>
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent sessions</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {history.map((h) => (
              <div key={h.id} className="flex justify-between border-b pb-2">
                <span>{new Date(h.opened_at).toLocaleDateString()} → {h.closed_at ? new Date(h.closed_at).toLocaleString() : "—"}</span>
                <span>Opened {formatMoney(h.opening_cash)} · Closed {formatMoney(h.closing_cash ?? 0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-semibold">{value}</div></div>;
}