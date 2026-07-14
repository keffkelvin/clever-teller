import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — Photon POS" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase handles the recovery token in the URL hash automatically and
    // fires a PASSWORD_RECOVERY event; also handle the case where the user
    // is already signed in via the recovery link.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated — please sign in");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold">Photon POS</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>
              {ready
                ? "Enter a new password for your account."
                : "Open the reset link from your email to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rp-pw">New password</Label>
                <Input id="rp-pw" type="password" minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)} disabled={!ready} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rp-pw2">Confirm password</Label>
                <Input id="rp-pw2" type="password" minLength={6} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} disabled={!ready} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !ready}>
                {loading ? "Saving…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/auth" className="hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}