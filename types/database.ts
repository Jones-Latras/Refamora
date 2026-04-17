import type { FulfillmentType, ListingStatus, UserRole } from './app'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_events: {
        Row: {
          id: string
          user_id: string
          feature:
            | 'listing_copilot'
            | 'waste_value_advisor'
            | 'buyer_search_assistant'
            | 'listing_moderation'
            | 'photo_quality_checker'
            | 'messaging_support'
          provider: 'local_gemma' | 'gemini' | null
          fallback_used: boolean
          request_status: 'success' | 'error'
          latency_ms: number | null
          helpful: boolean | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature:
            | 'listing_copilot'
            | 'waste_value_advisor'
            | 'buyer_search_assistant'
            | 'listing_moderation'
            | 'photo_quality_checker'
            | 'messaging_support'
          provider?: 'local_gemma' | 'gemini' | null
          fallback_used?: boolean
          request_status?: 'success' | 'error'
          latency_ms?: number | null
          helpful?: boolean | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          user_id?: string
          feature?:
            | 'listing_copilot'
            | 'waste_value_advisor'
            | 'buyer_search_assistant'
            | 'listing_moderation'
            | 'photo_quality_checker'
            | 'messaging_support'
          provider?: 'local_gemma' | 'gemini' | null
          fallback_used?: boolean
          request_status?: 'success' | 'error'
          latency_ms?: number | null
          helpful?: boolean | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string | null
          full_name: string
          phone: string | null
          role: UserRole | null
          city: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name: string
          phone?: string | null
          role?: UserRole | null
          city?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string
          phone?: string | null
          role?: UserRole | null
          city?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          id: string
          seller_id: string
          title: string
          waste_type: string
          description: string | null
          quantity: number
          unit: string
          price: number
          accept_offers: boolean
          image_url: string | null
          address: string | null
          city: string | null
          latitude: number | null
          longitude: number | null
          fulfillment_type: FulfillmentType
          status: ListingStatus
          created_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          waste_type: string
          description?: string | null
          quantity: number
          unit: string
          price: number
          accept_offers?: boolean
          image_url?: string | null
          address?: string | null
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          fulfillment_type?: FulfillmentType
          status?: ListingStatus
          created_at?: string
        }
        Update: {
          seller_id?: string
          title?: string
          waste_type?: string
          description?: string | null
          quantity?: number
          unit?: string
          price?: number
          accept_offers?: boolean
          image_url?: string | null
          address?: string | null
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          fulfillment_type?: FulfillmentType
          status?: ListingStatus
          created_at?: string
        }
        Relationships: []
      }
      listing_review_queue: {
        Row: {
          id: string
          seller_id: string
          listing_id: string | null
          ai_event_id: string | null
          decision: 'review' | 'block'
          queue_status: 'pending' | 'resolved' | 'dismissed'
          title: string
          waste_type: string | null
          city: string | null
          reasons: Json
          field_warnings: Json
          image_warnings: Json
          listing_snapshot: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          listing_id?: string | null
          ai_event_id?: string | null
          decision: 'review' | 'block'
          queue_status?: 'pending' | 'resolved' | 'dismissed'
          title: string
          waste_type?: string | null
          city?: string | null
          reasons?: Json
          field_warnings?: Json
          image_warnings?: Json
          listing_snapshot?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          seller_id?: string
          listing_id?: string | null
          ai_event_id?: string | null
          decision?: 'review' | 'block'
          queue_status?: 'pending' | 'resolved' | 'dismissed'
          title?: string
          waste_type?: string | null
          city?: string | null
          reasons?: Json
          field_warnings?: Json
          image_warnings?: Json
          listing_snapshot?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          message: string | null
          status: 'pending' | 'seen' | 'responded'
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          seller_id: string
          message?: string | null
          status?: 'pending' | 'seen' | 'responded'
          created_at?: string
        }
        Update: {
          listing_id?: string
          buyer_id?: string
          seller_id?: string
          message?: string | null
          status?: 'pending' | 'seen' | 'responded'
          created_at?: string
        }
        Relationships: []
      }
      waste_suggestions: {
        Row: {
          id: string
          waste_type: string
          suggested_use: string
        }
        Insert: {
          id?: string
          waste_type: string
          suggested_use: string
        }
        Update: {
          waste_type?: string
          suggested_use?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
