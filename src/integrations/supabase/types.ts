export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      billing: {
        Row: {
          assigned_price: number | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          id: string
          next_billing_date: string | null
          notes: string | null
          organization_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          assigned_price?: number | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          id?: string
          next_billing_date?: string | null
          notes?: string | null
          organization_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          assigned_price?: number | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          id?: string
          next_billing_date?: string | null
          notes?: string | null
          organization_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "billing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_checkins: {
        Row: {
          checkin_type: string | null
          consumer_id: string | null
          created_at: string | null
          event_id: string | null
          id: string
          organization_id: string | null
        }
        Insert: {
          checkin_type?: string | null
          consumer_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          organization_id?: string | null
        }
        Update: {
          checkin_type?: string | null
          consumer_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumer_checkins_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumer_checkins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_favorites: {
        Row: {
          consumer_id: string | null
          created_at: string | null
          id: string
          organization_id: string | null
        }
        Insert: {
          consumer_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
        }
        Update: {
          consumer_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumer_favorites_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumer_favorites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_orders: {
        Row: {
          consumer_id: string | null
          coupon_id: string | null
          created_at: string | null
          id: string
          payment_method_last4: string | null
          pickup_window_end: string | null
          pickup_window_start: string | null
          quantity: number | null
          status: string | null
          tax_amount: number | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          consumer_id?: string | null
          coupon_id?: string | null
          created_at?: string | null
          id?: string
          payment_method_last4?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          quantity?: number | null
          status?: string | null
          tax_amount?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          consumer_id?: string | null
          coupon_id?: string | null
          created_at?: string | null
          id?: string
          payment_method_last4?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          quantity?: number | null
          status?: string | null
          tax_amount?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consumer_orders_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumer_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      consumers: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          id: string
          invite_code_used: string | null
          last_name: string | null
          money_saved: number | null
          phone: string | null
          pounds_rescued: number | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          invite_code_used?: string | null
          last_name?: string | null
          money_saved?: number | null
          phone?: string | null
          pounds_rescued?: number | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          invite_code_used?: string | null
          last_name?: string | null
          money_saved?: number | null
          phone?: string | null
          pounds_rescued?: number | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          coupon_active_end: string | null
          coupon_active_start: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          location_id: string
          longitude: number | null
          organization_id: string
          original_price: number | null
          photo_url: string | null
          pickup_address: string | null
          price: number
          quantity_available: number
          quantity_remaining: number | null
          quantity_sold: number
          status: Database["public"]["Enums"]["coupon_status"]
          title: string
        }
        Insert: {
          coupon_active_end?: string | null
          coupon_active_start?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location_id: string
          longitude?: number | null
          organization_id: string
          original_price?: number | null
          photo_url?: string | null
          pickup_address?: string | null
          price: number
          quantity_available?: number
          quantity_remaining?: number | null
          quantity_sold?: number
          status?: Database["public"]["Enums"]["coupon_status"]
          title: string
        }
        Update: {
          coupon_active_end?: string | null
          coupon_active_start?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          organization_id?: string
          original_price?: number | null
          photo_url?: string | null
          pickup_address?: string | null
          price?: number
          quantity_available?: number
          quantity_remaining?: number | null
          quantity_sold?: number
          status?: Database["public"]["Enums"]["coupon_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          attendee_count: number
          city: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string | null
          external_link: string | null
          id: string
          image_url: string | null
          start_time: string | null
          state: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Insert: {
          address?: string | null
          attendee_count?: number
          city?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          start_time?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Update: {
          address?: string | null
          attendee_count?: number
          city?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          start_time?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
        }
        Relationships: []
      }
      food_listings: {
        Row: {
          created_at: string
          estimated_donation_value: number | null
          food_type: Database["public"]["Enums"]["food_type"] | null
          id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          location_id: string
          nonprofit_claimed_id: string | null
          notes: string | null
          organization_id: string
          photo_urls: string[] | null
          pickup_address: string | null
          pickup_window_end: string | null
          pickup_window_start: string | null
          pounds: number | null
          status: Database["public"]["Enums"]["listing_status"]
        }
        Insert: {
          created_at?: string
          estimated_donation_value?: number | null
          food_type?: Database["public"]["Enums"]["food_type"] | null
          id?: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          location_id: string
          nonprofit_claimed_id?: string | null
          notes?: string | null
          organization_id: string
          photo_urls?: string[] | null
          pickup_address?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          pounds?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
        }
        Update: {
          created_at?: string
          estimated_donation_value?: number | null
          food_type?: Database["public"]["Enums"]["food_type"] | null
          id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          location_id?: string
          nonprofit_claimed_id?: string | null
          notes?: string | null
          organization_id?: string
          photo_urls?: string[] | null
          pickup_address?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          pounds?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
        }
        Relationships: [
          {
            foreignKeyName: "food_listings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_listings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_listings_nonprofit_claimed_id_fkey"
            columns: ["nonprofit_claimed_id"]
            isOneToOne: false
            referencedRelation: "nonprofits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_reports: {
        Row: {
          created_at: string
          date_distributed: string | null
          food_listing_id: string
          id: string
          meals_served: number | null
          nonprofit_id: string
          notes: string | null
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          date_distributed?: string | null
          food_listing_id: string
          id?: string
          meals_served?: number | null
          nonprofit_id: string
          notes?: string | null
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          date_distributed?: string | null
          food_listing_id?: string
          id?: string
          meals_served?: number | null
          nonprofit_id?: string
          notes?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impact_reports_food_listing_id_fkey"
            columns: ["food_listing_id"]
            isOneToOne: false
            referencedRelation: "food_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_reports_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_codes: {
        Row: {
          city: string | null
          code: string
          created_at: string
          expiration_date: string | null
          id: string
          label: string | null
          status: Database["public"]["Enums"]["invitation_code_status"]
          times_used: number
        }
        Insert: {
          city?: string | null
          code: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          label?: string | null
          status?: Database["public"]["Enums"]["invitation_code_status"]
          times_used?: number
        }
        Update: {
          city?: string | null
          code?: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          label?: string | null
          status?: Database["public"]["Enums"]["invitation_code_status"]
          times_used?: number
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          region: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          region?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          region?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          county: string | null
          created_at: string
          estimated_surplus_frequency: string | null
          hours_of_operation: string | null
          id: string
          latitude: number | null
          location_type: string | null
          longitude: number | null
          marketplace_enabled: boolean
          name: string
          organization_id: string
          pickup_address: string | null
          pickup_instructions: string | null
          platform_fee_percentage: number
          state: string | null
          stripe_connect_account_id: string | null
          stripe_onboarding_status: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string
          estimated_surplus_frequency?: string | null
          hours_of_operation?: string | null
          id?: string
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          marketplace_enabled?: boolean
          name: string
          organization_id: string
          pickup_address?: string | null
          pickup_instructions?: string | null
          platform_fee_percentage?: number
          state?: string | null
          stripe_connect_account_id?: string | null
          stripe_onboarding_status?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string
          estimated_surplus_frequency?: string | null
          hours_of_operation?: string | null
          id?: string
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          marketplace_enabled?: boolean
          name?: string
          organization_id?: string
          pickup_address?: string | null
          pickup_instructions?: string | null
          platform_fee_percentage?: number
          state?: string | null
          stripe_connect_account_id?: string | null
          stripe_onboarding_status?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofit_locations: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          cabinetry: boolean | null
          city: string | null
          cold_storage: boolean | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          county: string | null
          created_at: string
          estimated_weekly_served: number | null
          food_types_accepted: Database["public"]["Enums"]["food_type"][] | null
          id: string
          name: string
          nonprofit_id: string
          operating_hours: string | null
          pickup_dropoff_instructions: string | null
          population_served: string | null
          refrigeration: boolean | null
          state: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          cabinetry?: boolean | null
          city?: string | null
          cold_storage?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string
          estimated_weekly_served?: number | null
          food_types_accepted?:
            | Database["public"]["Enums"]["food_type"][]
            | null
          id?: string
          name: string
          nonprofit_id: string
          operating_hours?: string | null
          pickup_dropoff_instructions?: string | null
          population_served?: string | null
          refrigeration?: boolean | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          cabinetry?: boolean | null
          city?: string | null
          cold_storage?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string
          estimated_weekly_served?: number | null
          food_types_accepted?:
            | Database["public"]["Enums"]["food_type"][]
            | null
          id?: string
          name?: string
          nonprofit_id?: string
          operating_hours?: string | null
          pickup_dropoff_instructions?: string | null
          population_served?: string | null
          refrigeration?: boolean | null
          state?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nonprofit_locations_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofits: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          cabinetry: boolean | null
          city: string | null
          cold_storage: boolean | null
          county: string | null
          created_at: string
          ein: string | null
          estimated_weekly_served: number | null
          food_types_accepted: Database["public"]["Enums"]["food_type"][] | null
          id: string
          join_code: string | null
          logo_url: string | null
          operating_hours: string | null
          organization_name: string
          population_served: string | null
          primary_contact: string | null
          primary_contact_email: string | null
          primary_contact_phone: string | null
          proof_of_insurance_url: string | null
          refrigeration: boolean | null
          signed_agreement_url: string | null
          social_handles: Json | null
          state: string | null
          user_id: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          cabinetry?: boolean | null
          city?: string | null
          cold_storage?: boolean | null
          county?: string | null
          created_at?: string
          ein?: string | null
          estimated_weekly_served?: number | null
          food_types_accepted?:
            | Database["public"]["Enums"]["food_type"][]
            | null
          id?: string
          join_code?: string | null
          logo_url?: string | null
          operating_hours?: string | null
          organization_name: string
          population_served?: string | null
          primary_contact?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          proof_of_insurance_url?: string | null
          refrigeration?: boolean | null
          signed_agreement_url?: string | null
          social_handles?: Json | null
          state?: string | null
          user_id?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          cabinetry?: boolean | null
          city?: string | null
          cold_storage?: boolean | null
          county?: string | null
          created_at?: string
          ein?: string | null
          estimated_weekly_served?: number | null
          food_types_accepted?:
            | Database["public"]["Enums"]["food_type"][]
            | null
          id?: string
          join_code?: string | null
          logo_url?: string | null
          operating_hours?: string | null
          organization_name?: string
          population_served?: string | null
          primary_contact?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          proof_of_insurance_url?: string | null
          refrigeration?: boolean | null
          signed_agreement_url?: string | null
          social_handles?: Json | null
          state?: string | null
          user_id?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          billing_contact: string | null
          city: string | null
          county: string | null
          created_at: string
          government_regions: Json | null
          id: string
          join_code: string | null
          name: string
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          state: string | null
          type: Database["public"]["Enums"]["organization_type"]
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          billing_contact?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          government_regions?: Json | null
          id?: string
          join_code?: string | null
          name: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          state?: string | null
          type: Database["public"]["Enums"]["organization_type"]
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          billing_contact?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          government_regions?: Json | null
          id?: string
          join_code?: string | null
          name?: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["organization_type"]
          zip?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          location_id: string | null
          nonprofit_id: string | null
          nonprofit_location_id: string | null
          organization_id: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          location_id?: string | null
          nonprofit_id?: string | null
          nonprofit_location_id?: string | null
          organization_id?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location_id?: string | null
          nonprofit_id?: string | null
          nonprofit_location_id?: string | null
          organization_id?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_nonprofit_location"
            columns: ["nonprofit_location_id"]
            isOneToOne: false
            referencedRelation: "nonprofit_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          organization_name: string | null
          phone: string | null
          status: Database["public"]["Enums"]["support_status"]
          subject: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          organization_name?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["support_status"]
          subject: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          organization_name?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["support_status"]
          subject?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      sustainability_baseline: {
        Row: {
          created_at: string
          current_handling: string | null
          donation_frequency: string | null
          estimated_daily_surplus: string | null
          generates_surplus: boolean | null
          id: string
          location_id: string
          priority_outcomes: string[] | null
          surplus_types: string[] | null
        }
        Insert: {
          created_at?: string
          current_handling?: string | null
          donation_frequency?: string | null
          estimated_daily_surplus?: string | null
          generates_surplus?: boolean | null
          id?: string
          location_id: string
          priority_outcomes?: string[] | null
          surplus_types?: string[] | null
        }
        Update: {
          created_at?: string
          current_handling?: string | null
          donation_frequency?: string | null
          estimated_daily_surplus?: string | null
          generates_surplus?: boolean | null
          id?: string
          location_id?: string
          priority_outcomes?: string[] | null
          surplus_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "sustainability_baseline_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sustainability_baseline_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      locations_public: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          city: string | null
          county: string | null
          hours_of_operation: string | null
          id: string | null
          latitude: number | null
          location_type: string | null
          longitude: number | null
          marketplace_enabled: boolean | null
          name: string | null
          organization_id: string | null
          pickup_address: string | null
          pickup_instructions: string | null
          platform_fee_percentage: number | null
          state: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          city?: string | null
          county?: string | null
          hours_of_operation?: string | null
          id?: string | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          marketplace_enabled?: boolean | null
          name?: string | null
          organization_id?: string | null
          pickup_address?: string | null
          pickup_instructions?: string | null
          platform_fee_percentage?: number | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          city?: string | null
          county?: string | null
          hours_of_operation?: string | null
          id?: string | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          marketplace_enabled?: boolean | null
          name?: string | null
          organization_id?: string | null
          pickup_address?: string | null
          pickup_instructions?: string | null
          platform_fee_percentage?: number | null
          state?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_own_profile: {
        Args: { p_first_name?: string; p_last_name?: string; p_phone?: string }
        Returns: undefined
      }
      user_has_any_role: { Args: { _user_id: string }; Returns: boolean }
      user_org_is_approved: { Args: { _user_id: string }; Returns: boolean }
      validate_and_use_invite_code: {
        Args: { code_input: string }
        Returns: Json
      }
      validate_join_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "venue_partner"
        | "nonprofit_partner"
        | "government_partner"
      approval_status: "pending" | "approved" | "rejected" | "deactivated"
      billing_cycle: "free" | "monthly" | "annual"
      coupon_status: "active" | "sold_out" | "expired" | "taken_down"
      event_status: "draft" | "published" | "archived"
      food_type:
        | "prepared_meals"
        | "produce"
        | "dairy"
        | "meat_protein"
        | "baked_goods"
        | "shelf_stable"
        | "frozen"
      invitation_code_status: "active" | "inactive"
      listing_status:
        | "posted"
        | "claimed"
        | "picked_up"
        | "pending_impact_report"
        | "completed"
        | "cancelled"
      listing_type: "donation" | "discounted_sale"
      organization_type:
        | "restaurant"
        | "catering_company"
        | "event"
        | "hotel"
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
        | "resort"
        | "cafe"
        | "food_beverage_group"
        | "hospitality_group"
        | "venue_events_group"
        | "farm_grocery_group"
        | "government_entity"
        | "nonprofit_organization"
      payment_status: "paid" | "unpaid" | "free"
      support_status: "new" | "in_progress" | "resolved"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "venue_partner",
        "nonprofit_partner",
        "government_partner",
      ],
      approval_status: ["pending", "approved", "rejected", "deactivated"],
      billing_cycle: ["free", "monthly", "annual"],
      coupon_status: ["active", "sold_out", "expired", "taken_down"],
      event_status: ["draft", "published", "archived"],
      food_type: [
        "prepared_meals",
        "produce",
        "dairy",
        "meat_protein",
        "baked_goods",
        "shelf_stable",
        "frozen",
      ],
      invitation_code_status: ["active", "inactive"],
      listing_status: [
        "posted",
        "claimed",
        "picked_up",
        "pending_impact_report",
        "completed",
        "cancelled",
      ],
      listing_type: ["donation", "discounted_sale"],
      organization_type: [
        "restaurant",
        "catering_company",
        "event",
        "hotel",
        "convention_center",
        "stadium",
        "arena",
        "farm",
        "grocery_store",
        "food_truck",
        "airport",
        "festival",
        "municipal_government",
        "county_government",
        "state_government",
        "resort",
        "cafe",
        "food_beverage_group",
        "hospitality_group",
        "venue_events_group",
        "farm_grocery_group",
        "government_entity",
        "nonprofit_organization",
      ],
      payment_status: ["paid", "unpaid", "free"],
      support_status: ["new", "in_progress", "resolved"],
    },
  },
} as const
