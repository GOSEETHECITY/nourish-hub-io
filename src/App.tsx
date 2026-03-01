import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
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
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VenueDashboard from "./pages/venue/VenueDashboard";
import NonprofitDashboard from "./pages/nonprofit/NonprofitDashboard";
import GovernmentDashboard from "./pages/government/GovernmentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
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

            {/* Venue Partner routes */}
            <Route
              path="/venue"
              element={
                <ProtectedRoute allowedRoles={["venue_partner"]}>
                  <VenueDashboard />
                </ProtectedRoute>
              }
            />

            {/* Nonprofit Partner routes */}
            <Route
              path="/nonprofit"
              element={
                <ProtectedRoute allowedRoles={["nonprofit_partner"]}>
                  <NonprofitDashboard />
                </ProtectedRoute>
              }
            />

            {/* Government Partner routes */}
            <Route
              path="/government"
              element={
                <ProtectedRoute allowedRoles={["government_partner"]}>
                  <GovernmentDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
