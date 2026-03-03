import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { validatePassword } from "@/lib/validatePassword";
import logo from "@/assets/logo.png";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Supabase will have already exchanged the token and created a session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionReady(true);
        setUserEmail(session.user.email || "");
      } else {
        // Listen for auth state change (token exchange may be in progress)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setSessionReady(true);
            setUserEmail(session.user.email || "");
          }
        });
        // Timeout after 5s
        setTimeout(() => {
          setSessionReady(true); // Show the form regardless
        }, 5000);
        return () => subscription.unsubscribe();
      }
    };
    checkSession();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwError = validatePassword(password);
    if (pwError) {
      toast({ title: "Invalid password", description: pwError, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch role to route correctly
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      const role = roleData?.role;
      toast({ title: "Account set up!", description: "Welcome to HarietAI." });
      switch (role) {
        case "venue_partner": navigate("/venue"); break;
        case "nonprofit_partner": navigate("/nonprofit"); break;
        case "government_partner": navigate("/government"); break;
        default: navigate("/"); break;
      }
    } else {
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary rounded-2xl p-4">
              <img src={logo} alt="HarietAI" className="h-10 w-auto" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Set Up Your Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {userEmail ? `Welcome, ${userEmail}` : "Complete your account setup"}
          </p>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Create Password</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Min 8 characters with uppercase, lowercase, and number
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <PasswordInput
              id="confirm-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? "Setting up..." : "Complete Setup"}
          </Button>
        </form>
      </div>
    </div>
  );
}
