import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, Clock, AlertTriangle, FileWarning, UserPlus, Scale } from "lucide-react";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function sevenDaysAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  to: string;
}
function StatCard({ icon: Icon, label, value, sub, to }: StatCardProps) {
  return (
    <Link to={to} className="bg-card rounded-xl border p-5 min-w-0 hover:border-primary transition-colors block">
      <p className="text-sm text-muted-foreground flex items-center gap-2"><Icon className="w-4 h-4 shrink-0" />{label}</p>
      <p className="text-3xl font-bold text-foreground mt-2 break-words">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub ?? "\u00a0"}</p>
    </Link>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();

      const [today, pendingOrgs, pendingNonprofits, unclaimed, overdue, signups] = await Promise.all([
        supabase.from("food_listings").select("pounds").gte("created_at", startOfToday()),
        supabase.from("organizations").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("nonprofits").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("food_listings").select("id, created_at").is("nonprofit_claimed_id", null).eq("status", "posted").order("created_at", { ascending: true }),
        supabase.from("food_listings").select("id").not("picked_up_at", "is", null).lt("picked_up_at", new Date(Date.now() - 72 * 3600 * 1000).toISOString()).in("status", ["picked_up", "pending_impact_report"]),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo()),
      ]);

      const todayRows = today.data ?? [];
      const unclaimedRows = unclaimed.data ?? [];

      // Receipts overdue: picked up more than 72h ago with no tax receipt submitted.
      let overdueCount = 0;
      const overdueIds = (overdue.data ?? []).map((r: any) => r.id);
      if (overdueIds.length) {
        const { data: receipts } = await supabase.from("tax_receipts").select("food_listing_id").in("food_listing_id", overdueIds);
        const withReceipt = new Set((receipts ?? []).map((r: any) => r.food_listing_id));
        overdueCount = overdueIds.filter((id) => !withReceipt.has(id)).length;
      }

      return {
        nowIso,
        todayCount: todayRows.length,
        todayPounds: todayRows.reduce((s: number, r: any) => s + Number(r.pounds ?? 0), 0),
        pendingApprovals: (pendingOrgs.count ?? 0) + (pendingNonprofits.count ?? 0),
        unclaimedCount: unclaimedRows.length,
        oldestUnclaimed: unclaimedRows[0]?.created_at ?? null,
        overdueCount,
        newSignups: signups.count ?? 0,
      };
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform activity at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          icon={Package}
          label="Donations posted today"
          value={isLoading ? "—" : String(data?.todayCount ?? 0)}
          sub={isLoading ? undefined : `${Math.round(data?.todayPounds ?? 0).toLocaleString()} lbs`}
          to="/admin/donations"
        />
        <StatCard
          icon={Clock}
          label="Pending approvals"
          value={isLoading ? "—" : String(data?.pendingApprovals ?? 0)}
          sub="Organizations and nonprofits"
          to="/admin/organizations-pending"
        />
        <StatCard
          icon={AlertTriangle}
          label="Unclaimed donations"
          value={isLoading ? "—" : String(data?.unclaimedCount ?? 0)}
          sub={data?.oldestUnclaimed ? `Oldest posted ${new Date(data.oldestUnclaimed).toLocaleString()}` : "None outstanding"}
          to="/admin/donations?status=posted"
        />
        <StatCard
          icon={FileWarning}
          label="Receipts overdue (72h+)"
          value={isLoading ? "—" : String(data?.overdueCount ?? 0)}
          sub="Awaiting nonprofit receipt"
          to="/admin/donations?status=picked_up"
        />
        <StatCard
          icon={UserPlus}
          label="New partner signups"
          value={isLoading ? "—" : String(data?.newSignups ?? 0)}
          sub="Last 7 days"
          to="/admin/accounts"
        />
        <StatCard
          icon={Scale}
          label="Pounds rescued today"
          value={isLoading ? "—" : Math.round(data?.todayPounds ?? 0).toLocaleString()}
          sub="Across every venue"
          to="/impact"
        />
      </div>
    </div>
  );
}
