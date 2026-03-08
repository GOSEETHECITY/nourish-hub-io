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
import OrganizationDetail from "./pages/OrganizationDetail";
import LocationDetail from "./pages/LocationDetail";
import FoodListingsDonations from "./pages/FoodListingsDonations";
import DonationDetail from "./pages/DonationDetail";
import FoodListingsDiscounted from "./pages/FoodListingsDiscounted";
import CouponDetail from "./pages/CouponDetail";
import Nonprofits from "./pages/Nonprofits";
import NonprofitDetail from "./pages/NonprofitDetail";
import Events from "./pages/Events";
import Marketplace from "./pages/Marketplace";
import MarketplacePartnerDetail from "./pages/MarketplacePartnerDetail";
import Impact from "./pages/Impact";
import UsersPage from "./pages/UsersPage";
import Billing from "./pages/Billing";
import Support from "./pages/Support";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AcceptInvitation from "./pages/auth/AcceptInvitation";
// Venue
import VenueDashboard from "./pages/venue/VenueDashboard";
import VenueDashboardHome from "./pages/venue/VenueDashboardHome";
import VenueDonations from "./pages/venue/VenueDonations";
import VenueMarketplace from "./pages/venue/VenueMarketplace";
import VenueImpact from "./pages/venue/VenueImpact";
import VenueBaseline from "./pages/venue/VenueBaseline";
import VenueLocations from "./pages/venue/VenueLocations";
import VenueSettings from "./pages/venue/VenueSettings";
import VenueSupport from "./pages/venue/VenueSupport";
import VenueOnboarding from "./pages/venue/VenueOnboarding";
// Nonprofit
import NonprofitDashboard from "./pages/nonprofit/NonprofitDashboard";
import NonprofitDashboardHome from "./pages/nonprofit/NonprofitDashboardHome";
import NonprofitAvailable from "./pages/nonprofit/NonprofitAvailable";
import NonprofitClaimed from "./pages/nonprofit/NonprofitClaimed";
import NonprofitImpactReports from "./pages/nonprofit/NonprofitImpactReports";
import NonprofitDistributionLocations from "./pages/nonprofit/NonprofitDistributionLocations";
import NonprofitSettings from "./pages/nonprofit/NonprofitSettings";
import NonprofitSupport from "./pages/nonprofit/NonprofitSupport";
// Government
import GovernmentDashboard from "./pages/government/GovernmentDashboard";
import GovernmentDashboardHome from "./pages/government/GovernmentDashboardHome";
import GovernmentListings from "./pages/government/GovernmentListings";
import GovernmentOrganizations from "./pages/government/GovernmentOrganizations";
import GovernmentNonprofits from "./pages/government/GovernmentNonprofits";
import GovernmentImpactReports from "./pages/government/GovernmentImpactReports";
import GovernmentSettings from "./pages/government/GovernmentSettings";
import GovernmentSupport from "./pages/government/GovernmentSupport";

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
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />

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
              <Route path="/organizations/:id" element={<OrganizationDetail />} />
              <Route path="/organizations/:id/locations/:locationId" element={<LocationDetail />} />
              <Route path="/food-listings/donations" element={<FoodListingsDonations />} />
              <Route path="/food-listings/donations/:listingId" element={<DonationDetail />} />
              <Route path="/food-listings/discounted-sale" element={<FoodListingsDiscounted />} />
              <Route path="/food-listings/discounted-sale/:couponId" element={<CouponDetail />} />
              <Route path="/nonprofits" element={<Nonprofits />} />
              <Route path="/nonprofits/:id" element={<NonprofitDetail />} />
              <Route path="/events" element={<Events />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/:orgId" element={<MarketplacePartnerDetail />} />
              <Route path="/impact" element={<Impact />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/support" element={<Support />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Venue Partner routes */}
            <Route path="/venue/onboarding" element={<ProtectedRoute allowedRoles={["venue_partner"]}><VenueOnboarding /></ProtectedRoute>} />
            <Route
              element={
                <ProtectedRoute allowedRoles={["venue_partner"]}>
                  <VenueDashboard />
                </ProtectedRoute>
              }
            >
              <Route path="/venue" element={<VenueDashboardHome />} />
              <Route path="/venue/donations" element={<VenueDonations />} />
              <Route path="/venue/marketplace" element={<VenueMarketplace />} />
              <Route path="/venue/impact" element={<VenueImpact />} />
              <Route path="/venue/baseline" element={<VenueBaseline />} />
              <Route path="/venue/locations" element={<VenueLocations />} />
              <Route path="/venue/settings" element={<VenueSettings />} />
              <Route path="/venue/support" element={<VenueSupport />} />
            </Route>

            {/* Nonprofit Partner routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["nonprofit_partner"]}>
                  <NonprofitDashboard />
                </ProtectedRoute>
              }
            >
              <Route path="/nonprofit" element={<NonprofitDashboardHome />} />
              <Route path="/nonprofit/available" element={<NonprofitAvailable />} />
              <Route path="/nonprofit/claimed" element={<NonprofitClaimed />} />
              <Route path="/nonprofit/reports" element={<NonprofitImpactReports />} />
              <Route path="/nonprofit/locations" element={<NonprofitDistributionLocations />} />
              <Route path="/nonprofit/settings" element={<NonprofitSettings />} />
              <Route path="/nonprofit/support" element={<NonprofitSupport />} />
            </Route>

            {/* Government Partner routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["government_partner"]}>
                  <GovernmentDashboard />
                </ProtectedRoute>
              }
            >
              <Route path="/government" element={<GovernmentDashboardHome />} />
              <Route path="/government/listings" element={<GovernmentListings />} />
              <Route path="/government/organizations" element={<GovernmentOrganizations />} />
              <Route path="/government/nonprofits" element={<GovernmentNonprofits />} />
              <Route path="/government/reports" element={<GovernmentImpactReports />} />
              <Route path="/government/settings" element={<GovernmentSettings />} />
              <Route path="/government/support" element={<GovernmentSupport />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
