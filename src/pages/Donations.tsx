import { Clock, Scale, Download } from "lucide-react";
import food1 from "@/assets/food-1.jpg";
import food2 from "@/assets/food-2.jpg";

const overviewStats = [
  { title: "Total Pounds Donated", value: "12.6", unit: "lbs", accent: "text-destructive" },
  { title: "No. of Donations", value: "628", accent: "text-accent" },
  { title: "Food Waste Diverted", value: "186.2", unit: "lbs", accent: "text-success" },
];

const donations = [
  {
    id: 9350,
    name: "Rethink Food",
    time: "3:00 PM",
    weight: "4.52lb",
    status: "Active",
    description: "50 fully loaded tacos available for pick up",
    image: food1,
    posted: "Posted Today ; 9:32 PM",
  },
  {
    id: 9351,
    name: "Dunkin' Donuts",
    time: "10:00 PM",
    weight: "6.00lb",
    status: "Active",
    description: "12 dozens of assorted donuts available for pick up",
    image: food2,
    posted: "Posted Today ; 09:45 PM",
  },
  {
    id: 9352,
    name: "Shake Shack",
    time: "10:00 PM",
    weight: "4.52lb",
    status: "Active",
    description: "50 fully loaded tacos available for pick up",
    image: food1,
    posted: "Posted Today ; 09:50 PM",
  },
  {
    id: 9353,
    name: "Dos Toro Taqueria",
    time: "10:00 PM",
    weight: "3.20lb",
    status: "Active",
    description: "10 assorted Dos Toro bowls available for pick up",
    image: food2,
    posted: "Posted Today ; 09:30 PM",
  },
];

export default function Donations() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Donation Overview</h1>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <Download className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-4">
        {overviewStats.map((stat) => (
          <div key={stat.title} className="bg-card rounded-xl border p-5">
            <p className={`text-sm font-medium ${stat.accent}`}>{stat.title}</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {stat.value}{" "}
              {stat.unit && (
                <span className="text-sm font-normal text-muted-foreground">{stat.unit}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Donation Requests */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Donation Requests</h2>
        <div className="space-y-4">
          {donations.map((donation) => (
            <div key={donation.id} className="bg-card rounded-xl border p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Donation Request &nbsp;#{donation.id}
              </p>
              <div className="flex gap-6">
                <img
                  src={donation.image}
                  alt={donation.name}
                  className="w-56 h-40 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground">{donation.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{donation.posted}</p>

                  <div className="flex items-center gap-8 mt-4">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Pick Up Time
                      </p>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5 mt-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {donation.time}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Weight
                      </p>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5 mt-1">
                        <Scale className="w-4 h-4 text-muted-foreground" />
                        {donation.weight}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-success/15 text-success text-xs font-semibold rounded">
                        {donation.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Description
                    </p>
                    <p className="text-sm text-foreground mt-1">{donation.description}</p>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button className="px-6 py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                      Accept Donation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
