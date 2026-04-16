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
      users: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone: string | null
          city: string | null
          role: UserRole | null
          avatar_url: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          city?: string | null
          role?: UserRole | null
          avatar_url?: string | null
          created_at?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          phone?: string | null
          city?: string | null
          role?: UserRole | null
          avatar_url?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string | null
          waste_type: string
          price: number
          unit: string
          quantity: number
          city: string | null
          image_url: string | null
          latitude: number | null
          longitude: number | null
          fulfillment_type: FulfillmentType
          status: ListingStatus
          created_at: string | null
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          description?: string | null
          waste_type: string
          price: number
          unit: string
          quantity: number
          city?: string | null
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          fulfillment_type?: FulfillmentType
          status?: ListingStatus
          created_at?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          waste_type?: string
          price?: number
          unit?: string
          quantity?: number
          city?: string | null
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          fulfillment_type?: FulfillmentType
          status?: ListingStatus
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
          created_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          seller_id: string
          message?: string | null
          created_at?: string | null
        }
        Update: {
          message?: string | null
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

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
