import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Dashboard from "./pages/Index";
import Organizations from "./pages/Organizations";
import FoodListingsDonations from "./pages/FoodListingsDonations";
import FoodListingsDiscounted from "./pages/FoodListingsDiscounted";
import Nonprofits from "./pages/Nonprofits";
import Events from "./pages/Events";
import Marketplace from "./pages/Marketplace";
import Impact from "./pages/Impact";
import UsersPage from "./pages/UsersPage";
import Billing from "./pages/Billing";
import Support from "./pages/Support";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/food-listings/donations" element={<FoodListingsDonations />} />
            <Route path="/food-listings/discounted-sale" element={<FoodListingsDiscounted />} />
            <Route path="/nonprofits" element={<Nonprofits />} />
            <Route path="/events" element={<Events />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/impact" element={<Impact />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/support" element={<Support />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
