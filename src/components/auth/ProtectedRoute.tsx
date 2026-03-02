import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/database";
import PendingApproval from "@/pages/auth/PendingApproval";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, user, role, loading } = useAuth();

  // Check approval status for venue/government partners (org-based)
  const { data: orgStatus, isLoading: orgLoading } = useQuery({
    queryKey: ["org-approval", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user!.id).single();
      if (!profile?.organization_id) return null;
      const { data: org } = await supabase.from("organizations").select("approval_status").eq("id", profile.organization_id).single();
      return org?.approval_status ?? null;
    },
    enabled: !!user && (role === "venue_partner" || role === "government_partner"),
  });

  // Check approval status for nonprofit partners
  const { data: nonprofitStatus, isLoading: nonprofitLoading } = useQuery({
    queryKey: ["nonprofit-approval", user?.id],
    queryFn: async () => {
      // Check via profile.nonprofit_id first
      const { data: profile } = await supabase.from("profiles").select("nonprofit_id").eq("id", user!.id).single();
      if (profile?.nonprofit_id) {
        const { data } = await supabase.from("nonprofits").select("approval_status").eq("id", profile.nonprofit_id).single();
        return data?.approval_status ?? null;
      }
      // Fallback: legacy check via user_id
      const { data } = await supabase.from("nonprofits").select("approval_status").eq("user_id", user!.id).single();
      return data?.approval_status ?? null;
    },
    enabled: !!user && role === "nonprofit_partner",
  });

  if (loading || orgLoading || nonprofitLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Check approval gates
  if (role === "venue_partner") {
    if (orgStatus === "rejected") return <PendingApproval status="rejected" type="venue" />;
    if (orgStatus !== "approved") return <PendingApproval status="pending" type="venue" />;
  }
  if (role === "nonprofit_partner") {
    if (nonprofitStatus === "rejected") return <PendingApproval status="rejected" type="nonprofit" />;
    if (nonprofitStatus !== "approved") return <PendingApproval status="pending" type="nonprofit" />;
  }
  if (role === "government_partner") {
    if (orgStatus === "rejected") return <PendingApproval status="rejected" type="government" />;
    if (orgStatus !== "approved") return <PendingApproval status="pending" type="government" />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    switch (role) {
      case "admin":
        return <Navigate to="/" replace />;
      case "venue_partner":
        return <Navigate to="/venue" replace />;
      case "nonprofit_partner":
        return <Navigate to="/nonprofit" replace />;
      case "government_partner":
        return <Navigate to="/government" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
