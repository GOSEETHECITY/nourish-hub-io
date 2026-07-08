import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Download, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import StatTile from "@/components/district/StatTile";
import FoodDivertedChart from "@/components/district/FoodDivertedChart";
import FunImpactCard from "@/components/district/FunImpactCard";
import UsdaGoalRing from "@/components/district/UsdaGoalRing";
import SchoolLeaderboard from "@/components/district/SchoolLeaderboard";
import NeedsAttention from "@/components/district/NeedsAttention";
import RecentPickups from "@/components/district/RecentPickups";
import SupportDeflection from "@/components/district/SupportDeflection";
import TimeTracker from "@/components/district/TimeTracker";
import { districtStats } from "@/lib/districtMockData";

export default function DistrictHome() {
  const [range, setRange] = useState("semester");

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <Card className="p-5 md:p-6 rounded-2xl border-0 shadow-sm bg-card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--district-primary) / 0.12)" }}>
            <Building2 className="w-7 h-7" style={{ color: "hsl(var(--district-primary))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Miami-Dade County Public Schools</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Fall 2026 Program · 9 Schools · Sept – Dec 2026</p>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="semester">Fall Semester</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Lbs Diverted" value={`${districtStats.lbsDiverted.toLocaleString()} lbs`} delta={districtStats.lbsDivertedDelta} />
        <StatTile label="Meals Donated" value={districtStats.mealsDonated.toLocaleString()} delta={districtStats.mealsDonatedDelta} />
        <StatTile label="Disposal Cost Savings" value={`$${districtStats.costSavings.toLocaleString()}`} delta={districtStats.costSavingsDelta} />
        <StatTile label="Schools Reporting Today" value={districtStats.schoolsReporting} delta={districtStats.schoolsReportingDelta} />
      </div>

      {/* Chart + right column */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <FoodDivertedChart />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <FunImpactCard />
          <UsdaGoalRing />
        </div>
      </div>

      {/* Leaderboard */}
      <SchoolLeaderboard />

      {/* Alerts + pickups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NeedsAttention />
        <RecentPickups />
      </div>

      {/* Support + time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SupportDeflection />
        <TimeTracker />
      </div>

      {/* Bottom actions */}
      <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card flex flex-wrap items-center gap-3">
        <Button
          className="text-primary-foreground"
          style={{ background: "hsl(var(--district-primary))" }}
          onClick={() => toast({ title: "Exporting monthly report", description: "Your PDF will download shortly." })}
        >
          <FileText className="w-4 h-4 mr-2" />Export Monthly Report
        </Button>
        <Button
          variant="outline"
          onClick={() => toast({ title: "Preparing board presentation", description: "Compiling data deck..." })}
        >
          <Download className="w-4 h-4 mr-2" />Download Board Presentation Data
        </Button>
      </Card>
    </div>
  );
}
