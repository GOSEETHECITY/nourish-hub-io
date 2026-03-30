import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConsumerAuthProvider } from "@/contexts/ConsumerAuthContext";
import { ConsumerCartProvider } from "@/contexts/ConsumerCartContext";
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
// GO See The City Consumer
import ConsumerLoading from "./pages/consumer/ConsumerLoading";
import ConsumerSplash from "./pages/consumer/ConsumerSplash";
import ConsumerInviteCode from "./pages/consumer/ConsumerInviteCode";
import ConsumerPhoneEntry from "./pages/consumer/ConsumerPhoneEntry";
import ConsumerVerification from "./pages/consumer/ConsumerVerification";
import ConsumerLogin from "./pages/consumer/ConsumerLogin";
import ConsumerSignup from "./pages/consumer/ConsumerSignup";
import ConsumerLocationPermission from "./pages/consumer/ConsumerLocationPermission";
import ConsumerHome from "./pages/consumer/ConsumerHome";
import ConsumerRestaurants from "./pages/consumer/ConsumerRestaurants";
import ConsumerRestaurantDetail from "./pages/consumer/ConsumerRestaurantDetail";
import ConsumerCouponDetail from "./pages/consumer/ConsumerCouponDetail";
import ConsumerEvents from "./pages/consumer/ConsumerEvents";
import ConsumerEventDetail from "./pages/consumer/ConsumerEventDetail";
import ConsumerProfile from "./pages/consumer/ConsumerProfile";
import ConsumerProfileEdit from "./pages/consumer/ConsumerProfileEdit";
import ConsumerCheckIns from "./pages/consumer/ConsumerCheckIns";
import ConsumerCart from "./pages/consumer/ConsumerCart";
import ConsumerAddPayment from "./pages/consumer/ConsumerAddPayment";
import ConsumerOrders from "./pages/consumer/ConsumerOrders";
import ConsumerFollows from "./pages/consumer/ConsumerFollows";
import ConsumerNotifications from "./pages/consumer/ConsumerNotifications";
import ConsumerFeedback from "./pages/consumer/ConsumerFeedback";
import ConsumerInviteFriends from "./pages/consumer/ConsumerInviteFriends";

import EventPreview from "./pages/consumer/EventPreview";
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

            {/* GO SEE THE CITY CONSUMER ROUTES */}
            <Route path="/app" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerLoading /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/splash" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerSplash /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/invite-code" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerInviteCode /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/phone-entry" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerPhoneEntry /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/verification" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerVerification /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/login" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerLogin /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/signup" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerSignup /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/location-permission" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerLocationPermission /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/home" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerHome /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/restaurants" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerRestaurants /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/restaurant/:id" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerRestaurantDetail /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/coupon/:id" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerCouponDetail /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/events" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerEvents /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/event/:id" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerEventDetail /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/profile" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerProfile /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/profile/edit" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerProfileEdit /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/checkins" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerCheckIns /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/cart" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerCart /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/add-payment" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerAddPayment /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/orders" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerOrders /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/follows" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerFollows /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/notifications" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerNotifications /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/feedback" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerFeedback /></ConsumerCartProvider></ConsumerAuthProvider>} />
            <Route path="/app/invite-friends" element={<ConsumerAuthProvider><ConsumerCartProvider><ConsumerInviteFriends /></ConsumerCartProvider></ConsumerAuthProvider>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
