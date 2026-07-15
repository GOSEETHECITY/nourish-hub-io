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
      admin_notifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: Database["public"]["Enums"]["admin_notification_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: Database["public"]["Enums"]["admin_notification_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: Database["public"]["Enums"]["admin_notification_type"]
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_name: string
          breakdown: Json | null
          created_at: string
          duplicates_skipped: number
          error_log: string | null
          errors: number
          events_found: number
          events_inserted: number
          finished_at: string | null
          id: string
          started_at: string
        }
        Insert: {
          agent_name: string
          breakdown?: Json | null
          created_at?: string
          duplicates_skipped?: number
          error_log?: string | null
          errors?: number
          events_found?: number
          events_inserted?: number
          finished_at?: string | null
          id?: string
          started_at?: string
        }
        Update: {
          agent_name?: string
          breakdown?: Json | null
          created_at?: string
          duplicates_skipped?: number
          error_log?: string | null
          errors?: number
          events_found?: number
          events_inserted?: number
          finished_at?: string | null
          id?: string
          started_at?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author: string
          body: string
          category: Database["public"]["Enums"]["article_category"]
          cover_image_url: string | null
          created_at: string
          excerpt: string
          id: string
          is_featured: boolean
          published_date: string
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          body?: string
          category: Database["public"]["Enums"]["article_category"]
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_featured?: boolean
          published_date?: string
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          body?: string
          category?: Database["public"]["Enums"]["article_category"]
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_featured?: boolean
          published_date?: string
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "billing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      city_thresholds: {
        Row: {
          city: string
          created_at: string
          current_consumer_count: number
          id: string
          marketplace_unlocked: boolean
          state: string | null
          threshold: number
        }
        Insert: {
          city: string
          created_at?: string
          current_consumer_count?: number
          id?: string
          marketplace_unlocked?: boolean
          state?: string | null
          threshold?: number
        }
        Update: {
          city?: string
          created_at?: string
          current_consumer_count?: number
          id?: string
          marketplace_unlocked?: boolean
          state?: string | null
          threshold?: number
        }
        Relationships: []
      }
      compliance_states: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          law_name: string
          state_code: string
          state_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          law_name: string
          state_code: string
          state_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          law_name?: string
          state_code?: string
          state_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      consumer_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string | null
          badge_id: number | null
          badge_key: string | null
          badge_name: string
          consumer_id: string | null
          earned_at: string | null
          id: string
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_id?: number | null
          badge_key?: string | null
          badge_name: string
          consumer_id?: string | null
          earned_at?: string | null
          id?: string
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_id?: number | null
          badge_key?: string | null
          badge_name?: string
          consumer_id?: string | null
          earned_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumer_badges_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
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
          {
            foreignKeyName: "consumer_checkins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
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
          {
            foreignKeyName: "consumer_favorites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_orders: {
        Row: {
          application_fee_cents: number
          consumer_id: string | null
          coupon_id: string | null
          created_at: string | null
          food_listing_id: string | null
          id: string
          is_free: boolean
          organization_id: string | null
          payment_method_last4: string | null
          picked_up_at: string | null
          pickup_code: string | null
          pickup_window_end: string | null
          pickup_window_start: string | null
          quantity: number | null
          ready_at: string | null
          refund_reason: string | null
          refunded_at: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          tax_amount: number | null
          total_price: number | null
          unit_price: number | null
          venue_payout_cents: number
        }
        Insert: {
          application_fee_cents?: number
          consumer_id?: string | null
          coupon_id?: string | null
          created_at?: string | null
          food_listing_id?: string | null
          id?: string
          is_free?: boolean
          organization_id?: string | null
          payment_method_last4?: string | null
          picked_up_at?: string | null
          pickup_code?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          quantity?: number | null
          ready_at?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          tax_amount?: number | null
          total_price?: number | null
          unit_price?: number | null
          venue_payout_cents?: number
        }
        Update: {
          application_fee_cents?: number
          consumer_id?: string | null
          coupon_id?: string | null
          created_at?: string | null
          food_listing_id?: string | null
          id?: string
          is_free?: boolean
          organization_id?: string | null
          payment_method_last4?: string | null
          picked_up_at?: string | null
          pickup_code?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          quantity?: number | null
          ready_at?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          tax_amount?: number | null
          total_price?: number | null
          unit_price?: number | null
          venue_payout_cents?: number
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
          {
            foreignKeyName: "consumer_orders_food_listing_id_fkey"
            columns: ["food_listing_id"]
            isOneToOne: false
            referencedRelation: "food_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumer_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumer_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      consumers: {
        Row: {
          avatar_url: string | null
          city: string | null
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
          referral_code: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
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
          referral_code?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
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
          referral_code?: string | null
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
            referencedRelation: "locations_government"
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
          {
            foreignKeyName: "coupons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_line_items: {
        Row: {
          created_at: string
          description: string
          food_listing_id: string
          food_type: Database["public"]["Enums"]["food_type"] | null
          id: string
          pounds: number | null
          quantity: number
          total_value: number | null
          unit_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          food_listing_id: string
          food_type?: Database["public"]["Enums"]["food_type"] | null
          id?: string
          pounds?: number | null
          quantity?: number
          total_value?: number | null
          unit_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          food_listing_id?: string
          food_type?: Database["public"]["Enums"]["food_type"] | null
          id?: string
          pounds?: number | null
          quantity?: number
          total_value?: number | null
          unit_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_line_items_food_listing_id_fkey"
            columns: ["food_listing_id"]
            isOneToOne: false
            referencedRelation: "food_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checkins: {
        Row: {
          checked_in_at: string | null
          event_id: string
          id: string
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          event_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          event_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          ai_generated_description: boolean
          attendee_count: number
          business_name: string | null
          category: string | null
          city: string | null
          county: string
          created_at: string
          created_from_import: boolean
          description: string | null
          end_time: string | null
          event_date: string | null
          external_link: string | null
          flyer_url: string | null
          id: string
          image_url: string | null
          import_batch_id: string | null
          latitude: number | null
          longitude: number | null
          offer_badge: string | null
          share_count: number
          share_url: string | null
          source_type: string | null
          start_time: string | null
          state: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Insert: {
          address?: string | null
          ai_generated_description?: boolean
          attendee_count?: number
          business_name?: string | null
          category?: string | null
          city?: string | null
          county?: string
          created_at?: string
          created_from_import?: boolean
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          external_link?: string | null
          flyer_url?: string | null
          id?: string
          image_url?: string | null
          import_batch_id?: string | null
          latitude?: number | null
          longitude?: number | null
          offer_badge?: string | null
          share_count?: number
          share_url?: string | null
          source_type?: string | null
          start_time?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Update: {
          address?: string | null
          ai_generated_description?: boolean
          attendee_count?: number
          business_name?: string | null
          category?: string | null
          city?: string | null
          county?: string
          created_at?: string
          created_from_import?: boolean
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          external_link?: string | null
          flyer_url?: string | null
          id?: string
          image_url?: string | null
          import_batch_id?: string | null
          latitude?: number | null
          longitude?: number | null
          offer_badge?: string | null
          share_count?: number
          share_url?: string | null
          source_type?: string | null
          start_time?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
        }
        Relationships: []
      }
      flash_reservations: {
        Row: {
          amount_paid_cents: number
          application_fee_cents: number
          consumer_id: string
          created_at: string
          expires_at: string
          food_listing_id: string
          id: string
          picked_up_at: string | null
          released_at: string | null
          reserved_at: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_paid_cents?: number
          application_fee_cents?: number
          consumer_id: string
          created_at?: string
          expires_at: string
          food_listing_id: string
          id?: string
          picked_up_at?: string | null
          released_at?: string | null
          reserved_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid_cents?: number
          application_fee_cents?: number
          consumer_id?: string
          created_at?: string
          expires_at?: string
          food_listing_id?: string
          id?: string
          picked_up_at?: string | null
          released_at?: string | null
          reserved_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_reservations_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_reservations_food_listing_id_fkey"
            columns: ["food_listing_id"]
            isOneToOne: false
            referencedRelation: "food_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      food_listings: {
        Row: {
          created_at: string
          estimated_donation_value: number | null
          flash_price_cents: number | null
          food_type: Database["public"]["Enums"]["food_type"] | null
          id: string
          is_flash: boolean
          is_free_to_public: boolean
          latitude: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          location_id: string
          longitude: number | null
          nonprofit_claimed_id: string | null
          notes: string | null
          organization_id: string
          photo_urls: string[] | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_window_end: string | null
          pickup_window_start: string | null
          pounds: number | null
          status: Database["public"]["Enums"]["listing_status"]
        }
        Insert: {
          created_at?: string
          estimated_donation_value?: number | null
          flash_price_cents?: number | null
          food_type?: Database["public"]["Enums"]["food_type"] | null
          id?: string
          is_flash?: boolean
          is_free_to_public?: boolean
          latitude?: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          location_id: string
          longitude?: number | null
          nonprofit_claimed_id?: string | null
          notes?: string | null
          organization_id: string
          photo_urls?: string[] | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          pounds?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
        }
        Update: {
          created_at?: string
          estimated_donation_value?: number | null
          flash_price_cents?: number | null
          food_type?: Database["public"]["Enums"]["food_type"] | null
          id?: string
          is_flash?: boolean
          is_free_to_public?: boolean
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          location_id?: string
          longitude?: number | null
          nonprofit_claimed_id?: string | null
          notes?: string | null
          organization_id?: string
          photo_urls?: string[] | null
          picked_up_at?: string | null
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
            referencedRelation: "locations_government"
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
            foreignKeyName: "food_listings_nonprofit_claimed_id_fkey"
            columns: ["nonprofit_claimed_id"]
            isOneToOne: false
            referencedRelation: "nonprofits_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
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
          {
            foreignKeyName: "impact_reports_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits_public"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_stats: {
        Row: {
          city_breakdown: Json
          id: number
          platform_totals: Json
          refreshed_at: string
          testimonials: Json
        }
        Insert: {
          city_breakdown?: Json
          id?: number
          platform_totals?: Json
          refreshed_at?: string
          testimonials?: Json
        }
        Update: {
          city_breakdown?: Json
          id?: number
          platform_totals?: Json
          refreshed_at?: string
          testimonials?: Json
        }
        Relationships: []
      }
      impact_surveys: {
        Row: {
          condition_comment: string | null
          created_at: string
          date_received: string | null
          demographics: string[] | null
          food_condition_good: boolean | null
          food_listing_id: string
          food_received: boolean | null
          id: string
          nonprofit_id: string
          people_fed: number | null
          photo_urls: string[] | null
          submitted_at: string | null
          testimonial: string | null
          testimonial_public: boolean
          token: string
          updated_at: string
          venue_organization_id: string
        }
        Insert: {
          condition_comment?: string | null
          created_at?: string
          date_received?: string | null
          demographics?: string[] | null
          food_condition_good?: boolean | null
          food_listing_id: string
          food_received?: boolean | null
          id?: string
          nonprofit_id: string
          people_fed?: number | null
          photo_urls?: string[] | null
          submitted_at?: string | null
          testimonial?: string | null
          testimonial_public?: boolean
          token?: string
          updated_at?: string
          venue_organization_id: string
        }
        Update: {
          condition_comment?: string | null
          created_at?: string
          date_received?: string | null
          demographics?: string[] | null
          food_condition_good?: boolean | null
          food_listing_id?: string
          food_received?: boolean | null
          id?: string
          nonprofit_id?: string
          people_fed?: number | null
          photo_urls?: string[] | null
          submitted_at?: string | null
          testimonial?: string | null
          testimonial_public?: boolean
          token?: string
          updated_at?: string
          venue_organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_surveys_food_listing_id_fkey"
            columns: ["food_listing_id"]
            isOneToOne: true
            referencedRelation: "food_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_surveys_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_surveys_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_surveys_venue_organization_id_fkey"
            columns: ["venue_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_surveys_venue_organization_id_fkey"
            columns: ["venue_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          batch_id: string
          created_event_id: string | null
          csv_filename: string
          error_message: string | null
          event_name: string
          id: string
          processed_at: string
          status: Database["public"]["Enums"]["import_log_status"]
        }
        Insert: {
          batch_id: string
          created_event_id?: string | null
          csv_filename: string
          error_message?: string | null
          event_name: string
          id?: string
          processed_at?: string
          status?: Database["public"]["Enums"]["import_log_status"]
        }
        Update: {
          batch_id?: string
          created_event_id?: string | null
          csv_filename?: string
          error_message?: string | null
          event_name?: string
          id?: string
          processed_at?: string
          status?: Database["public"]["Enums"]["import_log_status"]
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_created_event_id_fkey"
            columns: ["created_event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          max_uses: number
          role_type: string
          state: string
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
          max_uses?: number
          role_type?: string
          state?: string
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
          max_uses?: number
          role_type?: string
          state?: string
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
      irs_pub78_orgs: {
        Row: {
          city: string | null
          country: string | null
          deductibility_status: string | null
          ein: string
          last_synced_at: string
          organization_name: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          deductibility_status?: string | null
          ein: string
          last_synced_at?: string
          organization_name?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          deductibility_status?: string | null
          ein?: string
          last_synced_at?: string
          organization_name?: string | null
          state?: string | null
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
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
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
          {
            foreignKeyName: "nonprofit_locations_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits_public"
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
          credentials_sent_at: string | null
          ein: string | null
          estimated_weekly_served: number | null
          food_types_accepted: Database["public"]["Enums"]["food_type"][] | null
          id: string
          is_verified: boolean | null
          join_code: string | null
          logo_url: string | null
          operating_hours: string | null
          organization_bio: string | null
          organization_name: string
          population_served: string | null
          primary_contact: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          proof_of_insurance_url: string | null
          refrigeration: boolean | null
          signed_agreement_url: string | null
          social_handles: Json | null
          state: string | null
          temp_password_hint: string | null
          user_id: string | null
          website: string | null
          website_url: string | null
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
          credentials_sent_at?: string | null
          ein?: string | null
          estimated_weekly_served?: number | null
          food_types_accepted?:
            | Database["public"]["Enums"]["food_type"][]
            | null
          id?: string
          is_verified?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          operating_hours?: string | null
          organization_bio?: string | null
          organization_name: string
          population_served?: string | null
          primary_contact?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          proof_of_insurance_url?: string | null
          refrigeration?: boolean | null
          signed_agreement_url?: string | null
          social_handles?: Json | null
          state?: string | null
          temp_password_hint?: string | null
          user_id?: string | null
          website?: string | null
          website_url?: string | null
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
          credentials_sent_at?: string | null
          ein?: string | null
          estimated_weekly_served?: number | null
          food_types_accepted?:
            | Database["public"]["Enums"]["food_type"][]
            | null
          id?: string
          is_verified?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          operating_hours?: string | null
          organization_bio?: string | null
          organization_name?: string
          population_served?: string | null
          primary_contact?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          proof_of_insurance_url?: string | null
          refrigeration?: boolean | null
          signed_agreement_url?: string | null
          social_handles?: Json | null
          state?: string | null
          temp_password_hint?: string | null
          user_id?: string | null
          website?: string | null
          website_url?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          category: string
          created_at: string
          email_enabled: boolean
          id: string
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link_path: string | null
          metadata: Json
          organization_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          metadata?: Json
          organization_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          metadata?: Json
          organization_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_submissions: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          created_nonprofit_id: string | null
          created_organization_id: string | null
          ein: string | null
          ein_verification_result: Json | null
          ein_verified: boolean | null
          id: string
          organization_name: string
          organization_type: string
          parent_organization_id: string | null
          parent_organization_name: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          created_nonprofit_id?: string | null
          created_organization_id?: string | null
          ein?: string | null
          ein_verification_result?: Json | null
          ein_verified?: boolean | null
          id?: string
          organization_name: string
          organization_type: string
          parent_organization_id?: string | null
          parent_organization_name?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          created_nonprofit_id?: string | null
          created_organization_id?: string | null
          ein?: string | null
          ein_verification_result?: Json | null
          ein_verified?: boolean | null
          id?: string
          organization_name?: string
          organization_type?: string
          parent_organization_id?: string | null
          parent_organization_name?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_submissions_created_nonprofit_id_fkey"
            columns: ["created_nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_submissions_created_nonprofit_id_fkey"
            columns: ["created_nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_submissions_created_organization_id_fkey"
            columns: ["created_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_submissions_created_organization_id_fkey"
            columns: ["created_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_submissions_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_submissions_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_pricing: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["override_billing_cycle"]
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          organization_id: string
          override_amount: number
          override_currency: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["override_billing_cycle"]
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          override_amount: number
          override_currency?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["override_billing_cycle"]
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          override_amount?: number
          override_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_submissions: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          created_organization_id: string | null
          ein: string | null
          id: string
          irs_verification_notes: string | null
          irs_verification_status: string | null
          organization_name: string
          organization_type: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          created_organization_id?: string | null
          ein?: string | null
          id?: string
          irs_verification_notes?: string | null
          irs_verification_status?: string | null
          organization_name: string
          organization_type: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          created_organization_id?: string | null
          ein?: string | null
          id?: string
          irs_verification_notes?: string | null
          irs_verification_status?: string | null
          organization_name?: string
          organization_type?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          billing_contact: string | null
          business_bio: string | null
          city: string | null
          county: string | null
          created_at: string
          credentials_sent_at: string | null
          government_regions: Json | null
          hours_of_operation: Json | null
          id: string
          is_verified: boolean | null
          join_code: string | null
          logo_url: string | null
          marketplace_enabled: boolean | null
          name: string
          parent_organization_id: string | null
          platform_fee_percentage: number
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          state: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          temp_password_hint: string | null
          type: Database["public"]["Enums"]["organization_type"]
          website_url: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          billing_contact?: string | null
          business_bio?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          credentials_sent_at?: string | null
          government_regions?: Json | null
          hours_of_operation?: Json | null
          id?: string
          is_verified?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          marketplace_enabled?: boolean | null
          name: string
          parent_organization_id?: string | null
          platform_fee_percentage?: number
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          temp_password_hint?: string | null
          type: Database["public"]["Enums"]["organization_type"]
          website_url?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          billing_contact?: string | null
          business_bio?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          credentials_sent_at?: string | null
          government_regions?: Json | null
          hours_of_operation?: Json | null
          id?: string
          is_verified?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          marketplace_enabled?: boolean | null
          name?: string
          parent_organization_id?: string | null
          platform_fee_percentage?: number
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          temp_password_hint?: string | null
          type?: Database["public"]["Enums"]["organization_type"]
          website_url?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leads: {
        Row: {
          address: string | null
          comments: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          organization: string | null
          pathway: string
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          comments?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          organization?: string | null
          pathway?: string
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          comments?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          pathway?: string
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
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
          avatar_url?: string | null
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
          avatar_url?: string | null
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
            foreignKeyName: "fk_profiles_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
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
            referencedRelation: "locations_government"
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
          {
            foreignKeyName: "profiles_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits_public"
            referencedColumns: ["id"]
          },
        ]
      }
      push_dispatch_log: {
        Row: {
          audience: string
          created_at: string
          id: string
          request_id: number | null
          target: string | null
          title: string | null
          trigger_name: string
        }
        Insert: {
          audience: string
          created_at?: string
          id?: string
          request_id?: number | null
          target?: string | null
          title?: string | null
          trigger_name: string
        }
        Update: {
          audience?: string
          created_at?: string
          id?: string
          request_id?: number | null
          target?: string | null
          title?: string | null
          trigger_name?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          consumer_id: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          consumer_id: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          consumer_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_attempts: {
        Row: {
          bucket: string
          created_at: string
          id: string
          key: string
          success: boolean
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          key: string
          success?: boolean
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          key?: string
          success?: boolean
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referee_consumer_id: string
          referrer_consumer_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referee_consumer_id: string
          referrer_consumer_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referee_consumer_id?: string
          referrer_consumer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_consumer_id_fkey"
            columns: ["referee_consumer_id"]
            isOneToOne: true
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_consumer_id_fkey"
            columns: ["referrer_consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          cities: Json | null
          created_at: string
          id: string
          name: string
          state: string
          status: Database["public"]["Enums"]["region_status"]
          unlocked_at: string | null
          updated_at: string
          user_count: number
        }
        Insert: {
          cities?: Json | null
          created_at?: string
          id?: string
          name: string
          state: string
          status?: Database["public"]["Enums"]["region_status"]
          unlocked_at?: string | null
          updated_at?: string
          user_count?: number
        }
        Update: {
          cities?: Json | null
          created_at?: string
          id?: string
          name?: string
          state?: string
          status?: Database["public"]["Enums"]["region_status"]
          unlocked_at?: string | null
          updated_at?: string
          user_count?: number
        }
        Relationships: []
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
            referencedRelation: "locations_government"
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
      tax_receipts: {
        Row: {
          created_at: string
          food_listing_id: string
          id: string
          nonprofit_id: string
          pdf_path: string
          receipt_type: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
          venue_organization_id: string
        }
        Insert: {
          created_at?: string
          food_listing_id: string
          id?: string
          nonprofit_id: string
          pdf_path: string
          receipt_type: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
          venue_organization_id: string
        }
        Update: {
          created_at?: string
          food_listing_id?: string
          id?: string
          nonprofit_id?: string
          pdf_path?: string
          receipt_type?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
          venue_organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_receipts_food_listing_id_fkey"
            columns: ["food_listing_id"]
            isOneToOne: false
            referencedRelation: "food_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_receipts_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_receipts_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_receipts_venue_organization_id_fkey"
            columns: ["venue_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_receipts_venue_organization_id_fkey"
            columns: ["venue_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
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
      waitlist_signups: {
        Row: {
          city: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          phone_verified: boolean
          zip: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          phone_verified?: boolean
          zip?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          phone_verified?: boolean
          zip?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      locations_government: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          city: string | null
          county: string | null
          created_at: string | null
          estimated_surplus_frequency: string | null
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
          created_at?: string | null
          estimated_surplus_frequency?: string | null
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
          created_at?: string | null
          estimated_surplus_frequency?: string | null
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
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      locations_public: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          city: string | null
          county: string | null
          created_at: string | null
          estimated_surplus_frequency: string | null
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
          created_at?: string | null
          estimated_surplus_frequency?: string | null
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
          created_at?: string | null
          estimated_surplus_frequency?: string | null
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
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofits_public: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          cabinetry: boolean | null
          city: string | null
          cold_storage: boolean | null
          county: string | null
          created_at: string | null
          estimated_weekly_served: number | null
          food_types_accepted: Database["public"]["Enums"]["food_type"][] | null
          id: string | null
          logo_url: string | null
          operating_hours: string | null
          organization_name: string | null
          population_served: string | null
          refrigeration: boolean | null
          social_handles: Json | null
          state: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          cabinetry?: boolean | null
          city?: string | null
          cold_storage?: boolean | null
          county?: string | null
          created_at?: string | null
          estimated_weekly_served?: number | null
          food_types_accepted?:
            | Database["public"]["Enums"]["food_type"][]
            | null
          id?: string | null
          logo_url?: string | null
          operating_hours?: string | null
          organization_name?: string | null
          population_served?: string | null
          refrigeration?: boolean | null
          social_handles?: Json | null
          state?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          cabinetry?: boolean | null
          city?: string | null
          cold_storage?: boolean | null
          county?: string | null
          created_at?: string | null
          estimated_weekly_served?: number | null
          food_types_accepted?:
            | Database["public"]["Enums"]["food_type"][]
            | null
          id?: string | null
          logo_url?: string | null
          operating_hours?: string | null
          organization_name?: string | null
          population_served?: string | null
          refrigeration?: boolean | null
          social_handles?: Json | null
          state?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      organizations_public: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          city: string | null
          county: string | null
          created_at: string | null
          government_regions: Json | null
          id: string | null
          name: string | null
          state: string | null
          type: Database["public"]["Enums"]["organization_type"] | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          government_regions?: Json | null
          id?: string | null
          name?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["organization_type"] | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          government_regions?: Json | null
          id?: string | null
          name?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["organization_type"] | null
          zip?: string | null
        }
        Relationships: []
      }
      venue_partner_orders: {
        Row: {
          coupon_id: string | null
          created_at: string | null
          id: string | null
          pickup_window_end: string | null
          pickup_window_start: string | null
          quantity: number | null
          status: string | null
          tax_amount: number | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string | null
          id?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          quantity?: number | null
          status?: string | null
          tax_amount?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          coupon_id?: string | null
          created_at?: string | null
          id?: string | null
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
            foreignKeyName: "consumer_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_referral: { Args: { p_code: string }; Returns: string }
      award_badge: {
        Args: {
          p_consumer_id: string
          p_description: string
          p_icon: string
          p_key: string
          p_name: string
        }
        Returns: undefined
      }
      city_referral_leaderboard: {
        Args: { p_city: string; p_limit?: number }
        Returns: {
          consumer_id: string
          first_name: string
          rank: number
          referral_count: number
        }[]
      }
      consume_government_invitation_code: {
        Args: { p_code: string }
        Returns: {
          id: string
        }[]
      }
      create_consumer_order: {
        Args: { p_coupon_id: string; p_quantity: number }
        Returns: string
      }
      dispatch_push: {
        Args: { p_body: Json; p_trigger: string }
        Returns: undefined
      }
      gen_pickup_code: { Args: never; Returns: string }
      gen_referral_code: { Args: never; Returns: string }
      get_impact_survey_by_token: {
        Args: { p_token: string }
        Returns: {
          donation_date: string
          food_type: string
          id: string
          nonprofit_name: string
          pounds: number
          submitted_at: string
          venue_name: string
        }[]
      }
      get_nonprofit_join_code: {
        Args: { _nonprofit_id: string }
        Returns: string
      }
      get_org_join_code: { Args: { _org_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_attendee_count: { Args: { eid: string }; Returns: undefined }
      increment_share_count: { Args: { event_id: string }; Returns: undefined }
      my_referral_rank: {
        Args: { p_city: string }
        Returns: {
          rank: number
          referral_count: number
        }[]
      }
      notify_org_members: {
        Args: {
          p_body: string
          p_link: string
          p_metadata?: Json
          p_org_id: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      release_flash_reservation: {
        Args: { p_reason?: string; p_reservation_id: string }
        Returns: undefined
      }
      reserve_flash_listing: { Args: { p_listing_id: string }; Returns: string }
      submit_impact_survey: {
        Args: {
          p_condition_comment: string
          p_date_received: string
          p_demographics: string[]
          p_food_condition_good: boolean
          p_food_received: boolean
          p_people_fed: number
          p_photo_urls: string[]
          p_testimonial: string
          p_token: string
        }
        Returns: string
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
      verify_ein: { Args: { p_ein: string }; Returns: Json }
    }
    Enums: {
      admin_notification_type:
        | "new_donation"
        | "new_signup"
        | "new_coupon"
        | "region_unlocked"
        | "billing_alert"
        | "system"
      app_role:
        | "admin"
        | "venue_partner"
        | "nonprofit_partner"
        | "government_partner"
      approval_status: "pending" | "approved" | "rejected" | "deactivated"
      article_category:
        | "press_release"
        | "product_update"
        | "partnership"
        | "company_news"
        | "milestone"
        | "grand_opening"
      article_status: "draft" | "published"
      billing_cycle: "free" | "monthly" | "annual"
      coupon_status: "active" | "sold_out" | "expired" | "taken_down"
      event_status: "draft" | "published" | "archived" | "pending" | "rejected"
      food_type:
        | "prepared_meals"
        | "produce"
        | "dairy"
        | "meat_protein"
        | "baked_goods"
        | "shelf_stable"
        | "frozen"
        | "mixed"
      import_log_status: "success" | "skipped" | "pending_image_retry" | "error"
      invitation_code_status: "active" | "inactive"
      lead_status:
        | "new"
        | "contacted"
        | "in_progress"
        | "converted"
        | "not_interested"
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
        | "franchise"
      override_billing_cycle: "monthly" | "annual"
      override_status: "active" | "expired" | "scheduled"
      payment_status: "paid" | "unpaid" | "free"
      region_status: "locked" | "unlocked"
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
      admin_notification_type: [
        "new_donation",
        "new_signup",
        "new_coupon",
        "region_unlocked",
        "billing_alert",
        "system",
      ],
      app_role: [
        "admin",
        "venue_partner",
        "nonprofit_partner",
        "government_partner",
      ],
      approval_status: ["pending", "approved", "rejected", "deactivated"],
      article_category: [
        "press_release",
        "product_update",
        "partnership",
        "company_news",
        "milestone",
        "grand_opening",
      ],
      article_status: ["draft", "published"],
      billing_cycle: ["free", "monthly", "annual"],
      coupon_status: ["active", "sold_out", "expired", "taken_down"],
      event_status: ["draft", "published", "archived", "pending", "rejected"],
      food_type: [
        "prepared_meals",
        "produce",
        "dairy",
        "meat_protein",
        "baked_goods",
        "shelf_stable",
        "frozen",
        "mixed",
      ],
      import_log_status: ["success", "skipped", "pending_image_retry", "error"],
      invitation_code_status: ["active", "inactive"],
      lead_status: [
        "new",
        "contacted",
        "in_progress",
        "converted",
        "not_interested",
      ],
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
        "franchise",
      ],
      override_billing_cycle: ["monthly", "annual"],
      override_status: ["active", "expired", "scheduled"],
      payment_status: ["paid", "unpaid", "free"],
      region_status: ["locked", "unlocked"],
      support_status: ["new", "in_progress", "resolved"],
    },
  },
} as const
