import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Photon POS" }] }),
  component: SettingsPage,
});

type Settings = {
  shop_name: string;
  address: string;
  phone: string;
  email: string;
  kra_pin: string;
  logo_url: string;
  default_tax_rate: number;
  default_low_stock_threshold: number;
  receipt_header: string;
  receipt_footer: string;
};

const empty: Settings = {
  shop_name: "Photon Electronics & Electricals",
  address: "",
  phone: "",
  email: "",
  kra_pin: "",
  logo_url: "",
  default_tax_rate: 0,
  default_low_stock_threshold: 5,
  receipt_header: "",
  receipt_footer: "Thank you for your business!",
};

function SettingsPage() {
  const [form, setForm] = useState<Settings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("business_settings").select("*").eq("owner_id", u.user.id).maybeSingle();
      if (data) {
        setForm({
          shop_name: data.shop_name,
          address: data.address ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          kra_pin: data.kra_pin ?? "",
          logo_url: data.logo_url ?? "",
          default_tax_rate: Number(data.default_tax_rate),
          default_low_stock_threshold: data.default_low_stock_threshold,
          receipt_header: data.receipt_header ?? "",
          receipt_footer: data.receipt_footer,
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const payload = { ...form, owner_id: u.user.id, currency_code: "KES", currency_symbol: "KSh" };
    const { error } = await supabase.from("business_settings").upsert(payload, { onConflict: "owner_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div><h1 className="text-2xl font-bold">Business Settings</h1><p className="text-sm text-muted-foreground">Shop info that appears on receipts and reports.</p></div>

      <Card>
        <CardHeader><CardTitle>Shop information</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Shop name</Label><Input value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254…" /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>KRA PIN</Label><Input value={form.kra_pin} onChange={(e) => setForm({ ...form, kra_pin: e.target.value })} /></div>
            <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>VAT / tax rate (%)</Label><Input type="number" step="0.01" value={form.default_tax_rate} onChange={(e) => setForm({ ...form, default_tax_rate: Number(e.target.value) })} /></div>
            <div><Label>Default low-stock alert</Label><Input type="number" value={form.default_low_stock_threshold} onChange={(e) => setForm({ ...form, default_low_stock_threshold: Number(e.target.value) })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Receipt</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Receipt header (extra line above items)</Label><Textarea rows={2} value={form.receipt_header} onChange={(e) => setForm({ ...form, receipt_header: e.target.value })} /></div>
          <div><Label>Receipt footer</Label><Textarea rows={2} value={form.receipt_footer} onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button></div>
    </div>
  );
}