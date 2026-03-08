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
  const { session, user, profile, role, loading } = useAuth();
  const requiresOrgApproval = role === "venue_partner" || role === "government_partner";
  const requiresNonprofitApproval = role === "nonprofit_partner";

  // Check approval status for venue/government partners (org-based)
  const {
    data: orgStatus,
    isLoading: orgLoading,
    error: orgError,
  } = useQuery({
    queryKey: ["org-approval", user?.id, profile?.organization_id, profile?.location_id, role],
    queryFn: async () => {
      if (!profile) return null;

      let organizationId = profile.organization_id;

      // Location-level venue users can inherit organization via location
      if (!organizationId && profile.location_id) {
        const { data: location, error: locationError } = await supabase
          .from("locations")
          .select("organization_id")
          .eq("id", profile.location_id)
          .maybeSingle();

        if (locationError) throw locationError;
        organizationId = location?.organization_id ?? null;
      }

      if (!organizationId) return null;

      const { data: org, error: orgFetchError } = await supabase
        .from("organizations")
        .select("approval_status")
        .eq("id", organizationId)
        .maybeSingle();

      if (orgFetchError) throw orgFetchError;
      return org?.approval_status ?? null;
    },
    enabled: !!user && !!profile && requiresOrgApproval,
    retry: 2,
  });

  // Check approval status for nonprofit partners
  const {
    data: nonprofitStatus,
    isLoading: nonprofitLoading,
    error: nonprofitError,
  } = useQuery({
    queryKey: ["nonprofit-approval", user?.id, profile?.nonprofit_id, role],
    queryFn: async () => {
      if (!user || !profile) return null;

      // Check via profile.nonprofit_id first
      if (profile.nonprofit_id) {
        const { data, error } = await supabase
          .from("nonprofits")
          .select("approval_status")
          .eq("id", profile.nonprofit_id)
          .maybeSingle();

        if (error) throw error;
        return data?.approval_status ?? null;
      }

      // Fallback: legacy check via user_id
      const { data, error } = await supabase
        .from("nonprofits")
        .select("approval_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.approval_status ?? null;
    },
    enabled: !!user && !!profile && requiresNonprofitApproval,
    retry: 2,
  });

  if (loading || (requiresOrgApproval && orgLoading) || (requiresNonprofitApproval && nonprofitLoading)) {
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

  if ((requiresOrgApproval || requiresNonprofitApproval) && !profile) {
    return <Navigate to="/login" replace />;
  }

  if (orgError || nonprofitError) {
    return <Navigate to="/login" replace />;
  }

  // Check approval gates
  if (role === "venue_partner") {
    if (orgStatus === "rejected" || orgStatus === "deactivated") return <PendingApproval status="rejected" type="venue" />;
    if (orgStatus !== "approved") return <PendingApproval status="pending" type="venue" />;
  }
  if (role === "nonprofit_partner") {
    if (nonprofitStatus === "rejected" || nonprofitStatus === "deactivated") return <PendingApproval status="rejected" type="nonprofit" />;
    if (nonprofitStatus !== "approved") return <PendingApproval status="pending" type="nonprofit" />;
  }
  if (role === "government_partner") {
    if (orgStatus === "rejected" || orgStatus === "deactivated") return <PendingApproval status="rejected" type="government" />;
    if (orgStatus !== "approved") return <PendingApproval status="pending" type="government" />;
  }

  if (allowedRoles && !role) {
    return <Navigate to="/login" replace />;
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

