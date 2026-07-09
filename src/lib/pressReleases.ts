export type ExternalPressRelease = {
  outlet: string;
  title: string;
  url: string;
  category: string;
  screenshot: string;
  accent: string;
  published_date: string;
};

export const externalPressReleases: ExternalPressRelease[] = [
  {
    outlet: "Black Wall Street Times",
    title: "GO See The City: Redirecting Food Waste to Those Facing Hunger",
    url: "https://theblackwallsttimes.com/2024/04/01/go-see-the-city-redirecting-food-waste-to-those-facing-hunger/",
    category: "Feature",
    screenshot:
      "https://image.thum.io/get/width/1200/crop/750/noanimate/https://theblackwallsttimes.com/2024/04/01/go-see-the-city-redirecting-food-waste-to-those-facing-hunger/",
    accent: "from-[#2d1a0a] via-[#6d412a] to-[#b88360]",
    published_date: "2024-04-01",
  },
  {
    outlet: "Inc.",
    title: "She Built a Clever App to Tackle Food Waste",
    url: "https://www.inc.com/farrell-evans/she-built-a-clever-app-to-tackle-food-waste/91148352",
    category: "Founder Profile",
    screenshot:
      "https://image.thum.io/get/width/1200/crop/750/noanimate/https://www.inc.com/farrell-evans/she-built-a-clever-app-to-tackle-food-waste/91148352",
    accent: "from-[#e0202c] via-[#c01020] to-[#800010]",
    published_date: "2024-03-15",
  },
  {
    outlet: "OKCFOX",
    title:
      "Levy Restaurant and GO See The City Donate Thunder, OU Games Leftover Food",
    url: "https://okcfox.com/news/local/levy-restaurant-and-go-see-the-city-donate-thunder-ou-games-leftover-food-food-desert-landfills-waste-hunger-university-of-oklahoma-football-spring-game-oklahoma-city-thunder-norman",
    category: "Partnership",
    screenshot:
      "https://image.thum.io/get/width/1200/crop/750/noanimate/https://okcfox.com/news/local/levy-restaurant-and-go-see-the-city-donate-thunder-ou-games-leftover-food-food-desert-landfills-waste-hunger-university-of-oklahoma-football-spring-game-oklahoma-city-thunder-norman",
    accent: "from-[#1a3a6e] via-[#2555a0] to-[#3b7fd8]",
    published_date: "2024-05-10",
  },
];
