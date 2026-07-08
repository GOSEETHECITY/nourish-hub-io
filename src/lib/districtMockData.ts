export const districtStats = {
  lbsDiverted: 12847,
  lbsDivertedDelta: "+312 today",
  mealsDonated: 4215,
  mealsDonatedDelta: "+8.2% this week",
  costSavings: 4289,
  costSavingsDelta: "on pace for $8.5K",
  schoolsReporting: "9 of 9",
  schoolsReportingDelta: "100%",
};

export type ChartRange = "week" | "month" | "semester";

export const foodDivertedByRange: Record<ChartRange, { label: string; donated: number; composted: number; couldHave: number; waste: number }[]> = {
  week: [
    { label: "Mon", donated: 180, composted: 120, couldHave: 40, waste: 30 },
    { label: "Tue", donated: 210, composted: 140, couldHave: 55, waste: 28 },
    { label: "Wed", donated: 240, composted: 160, couldHave: 35, waste: 22 },
    { label: "Thu", donated: 205, composted: 155, couldHave: 60, waste: 34 },
    { label: "Fri", donated: 260, composted: 175, couldHave: 45, waste: 20 },
  ],
  month: [
    { label: "Wk 1", donated: 980, composted: 640, couldHave: 210, waste: 150 },
    { label: "Wk 2", donated: 1120, composted: 720, couldHave: 240, waste: 140 },
    { label: "Wk 3", donated: 1240, composted: 810, couldHave: 195, waste: 125 },
    { label: "Wk 4", donated: 1310, composted: 870, couldHave: 180, waste: 110 },
  ],
  semester: [
    { label: "Sep", donated: 3400, composted: 2100, couldHave: 720, waste: 480 },
    { label: "Oct", donated: 4100, composted: 2600, couldHave: 660, waste: 420 },
    { label: "Nov", donated: 4650, composted: 2900, couldHave: 580, waste: 380 },
    { label: "Dec", donated: 2900, composted: 1850, couldHave: 340, waste: 240 },
  ],
};

export const funImpactStats = [
  { text: "Enough food donated to fill 2.5 football fields", icon: "field" },
  { text: "Equivalent to feeding 4,215 hungry students a full meal", icon: "meal" },
  { text: "Same weight as 6 African elephants", icon: "elephant" },
  { text: "Would fill 3 school buses to capacity", icon: "bus" },
  { text: "Diverted enough waste to fill an Olympic swimming pool 1/4 full", icon: "pool" },
];

export const usdaGoal = { progress: 34, target: 50, label: "On track" };

export type SchoolRow = {
  rank: number;
  name: string;
  lbsDonated: number;
  lbsComposted: number;
  diversionRate: number;
  lastSubmission: string;
  status: "green" | "yellow" | "red";
};

export const schoolLeaderboard: SchoolRow[] = [
  { rank: 1, name: "Miami Beach Senior High", lbsDonated: 1842, lbsComposted: 1120, diversionRate: 78, lastSubmission: "Today, 1:12 PM", status: "green" },
  { rank: 2, name: "MAST Academy", lbsDonated: 1710, lbsComposted: 980, diversionRate: 74, lastSubmission: "Today, 12:48 PM", status: "green" },
  { rank: 3, name: "Coral Reef Senior High", lbsDonated: 1655, lbsComposted: 1040, diversionRate: 72, lastSubmission: "Today, 1:05 PM", status: "green" },
  { rank: 4, name: "Miami Palmetto Senior High", lbsDonated: 1520, lbsComposted: 890, diversionRate: 69, lastSubmission: "Today, 12:30 PM", status: "green" },
  { rank: 5, name: "Miami Killian Senior High", lbsDonated: 1395, lbsComposted: 820, diversionRate: 66, lastSubmission: "Today, 12:55 PM", status: "green" },
  { rank: 6, name: "Miami Norland Senior High", lbsDonated: 1240, lbsComposted: 760, diversionRate: 63, lastSubmission: "Today, 1:20 PM", status: "green" },
  { rank: 7, name: "Miami Southridge Senior High", lbsDonated: 1105, lbsComposted: 690, diversionRate: 60, lastSubmission: "Yesterday, 2:10 PM", status: "yellow" },
  { rank: 8, name: "Miami Sunset Senior High", lbsDonated: 980, lbsComposted: 620, diversionRate: 57, lastSubmission: "Today, 1:00 PM", status: "green" },
  { rank: 9, name: "Carol City Senior High", lbsDonated: 400, lbsComposted: 240, diversionRate: 34, lastSubmission: "3 days ago", status: "red" },
];

export const alerts = [
  { level: "red" as const, text: "Carol City HS — no data submitted 3 days" },
  { level: "yellow" as const, text: "Pickup missed at Gloria Floyd — rescheduled for tomorrow" },
  { level: "blue" as const, text: "New staff at MAST Academy — retraining video sent automatically" },
];

export const recentPickups = [
  { school: "Miami Beach Senior High", nonprofit: "Fertile Earth Foundation", lbs: 82, method: "Nonprofit Direct", when: "12 min ago" },
  { school: "MAST Academy", nonprofit: "Food Rescue US", lbs: 64, method: "Driver", when: "38 min ago" },
  { school: "Coral Reef Senior High", nonprofit: "Farm Share", lbs: 91, method: "Nonprofit Direct", when: "1 hr ago" },
  { school: "Miami Palmetto Senior High", nonprofit: "Feeding South Florida", lbs: 55, method: "Driver", when: "2 hr ago" },
  { school: "Miami Killian Senior High", nonprofit: "Fertile Earth Foundation", lbs: 47, method: "Nonprofit Direct", when: "3 hr ago" },
  { school: "Miami Norland Senior High", nonprofit: "Food Rescue US", lbs: 38, method: "Driver", when: "4 hr ago" },
];

export const supportBreakdown = {
  total: 47,
  sortIt: 43,
  hariet: 4,
  district: 0,
};

export const timeTracker = {
  hariet: 84,
  school: 31,
  district: 1.5,
};
