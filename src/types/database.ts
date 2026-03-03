export type AppRole = "admin" | "venue_partner" | "nonprofit_partner" | "government_partner";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "deactivated";

export type ListingType = "donation" | "discounted_sale";

export type ListingStatus =
  | "posted"
  | "claimed"
  | "picked_up"
  | "pending_impact_report"
  | "completed"
  | "cancelled";

export type CouponStatus = "active" | "sold_out" | "expired" | "taken_down";

export type EventStatus = "draft" | "published" | "archived";

export type InvitationCodeStatus = "active" | "inactive";

export type BillingCycle = "free" | "monthly" | "annual";

export type PaymentStatus = "paid" | "unpaid" | "free";

export type SupportStatus = "new" | "in_progress" | "resolved";

export type OrganizationType =
  | "restaurant"
  | "catering_company"
  | "event"
  | "hotel"
  | "resort"
  | "convention_center"
  | "stadium"
  | "arena"
  | "farm"
  | "grocery_store"
  | "food_truck"
  | "airport"
  | "festival"
  | "municipal_government"
  | "county_government"
  | "state_government"
  | "cafe"
  | "food_beverage_group"
  | "hospitality_group"
  | "venue_events_group"
  | "farm_grocery_group"
  | "government_entity"
  | "nonprofit_organization";

export type FoodType =
  | "prepared_meals"
  | "produce"
  | "dairy"
  | "meat_protein"
  | "baked_goods"
  | "shelf_stable"
  | "frozen";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  organization_id: string | null;
  location_id: string | null;
  nonprofit_id: string | null;
  nonprofit_location_id: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  billing_contact: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  join_code: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  pickup_address: string | null;
  pickup_instructions: string | null;
  hours_of_operation: string | null;
  estimated_surplus_frequency: string | null;
  marketplace_enabled: boolean;
  stripe_connect_account_id: string | null;
  stripe_onboarding_status: string | null;
  platform_fee_percentage: number;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
}

export interface FoodListing {
  id: string;
  location_id: string;
  organization_id: string;
  listing_type: ListingType;
  food_type: FoodType | null;
  pounds: number | null;
  estimated_donation_value: number | null;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  pickup_address: string | null;
  photo_urls: string[] | null;
  notes: string | null;
  status: ListingStatus;
  nonprofit_claimed_id: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  location_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  price: number;
  original_price: number | null;
  quantity_available: number;
  quantity_sold: number;
  quantity_remaining: number;
  coupon_active_start: string | null;
  coupon_active_end: string | null;
  pickup_address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: CouponStatus;
  created_at: string;
}

export interface ImpactReport {
  id: string;
  food_listing_id: string;
  nonprofit_id: string;
  meals_served: number | null;
  date_distributed: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface Nonprofit {
  id: string;
  user_id: string | null;
  organization_name: string;
  logo_url: string | null;
  ein: string | null;
  website: string | null;
  social_handles: Record<string, string> | null;
  proof_of_insurance_url: string | null;
  signed_agreement_url: string | null;
  primary_contact: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  operating_hours: string | null;
  cold_storage: boolean;
  refrigeration: boolean;
  cabinetry: boolean;
  food_types_accepted: FoodType[] | null;
  estimated_weekly_served: number | null;
  population_served: string | null;
  join_code: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
}

export interface NonprofitLocation {
  id: string;
  nonprofit_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  operating_hours: string | null;
  pickup_dropoff_instructions: string | null;
  cold_storage: boolean;
  refrigeration: boolean;
  cabinetry: boolean;
  food_types_accepted: FoodType[] | null;
  estimated_weekly_served: number | null;
  population_served: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
}

export interface HarietEvent {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  external_link: string | null;
  status: EventStatus;
  attendee_count: number;
  created_at: string;
}

export interface InvitationCode {
  id: string;
  code: string;
  label: string | null;
  city: string | null;
  times_used: number;
  expiration_date: string | null;
  status: InvitationCodeStatus;
  created_at: string;
}

export interface SustainabilityBaseline {
  id: string;
  location_id: string;
  generates_surplus: boolean;
  estimated_daily_surplus: string | null;
  surplus_types: string[] | null;
  current_handling: string | null;
  donation_frequency: string | null;
  priority_outcomes: string[] | null;
  created_at: string;
}

export interface BillingRecord {
  id: string;
  organization_id: string;
  assigned_price: number | null;
  billing_cycle: BillingCycle;
  payment_status: PaymentStatus;
  next_billing_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface SupportRequest {
  id: string;
  user_id: string | null;
  organization_name: string | null;
  user_name: string | null;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: SupportStatus;
  created_at: string;
}
