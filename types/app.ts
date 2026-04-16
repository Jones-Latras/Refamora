export type UserRole = 'farmer' | 'buyer'

export type ListingStatus = 'active' | 'sold' | 'unavailable'

export type FulfillmentType = 'pickup' | 'delivery' | 'both'

export type ServiceResult<T, E = Error> = {
  data: T | null
  error: E | null
}

export type ListingFilters = {
  wasteType?: string
  fulfillmentType?: FulfillmentType
  minPrice?: number
  maxPrice?: number
  search?: string
}

export type ListingPreview = {
  id: string
  title: string
  wasteType: string
  price: number
  unit: string
  quantity: number
  city: string
  imageUrl: string | null
  status: ListingStatus
  sellerName: string | null
  fulfillmentType: FulfillmentType
  createdAt: string
}

export type SellerProfile = {
  id: string
  fullName: string
  city: string | null
  avatarUrl: string | null
  phone: string | null
}

export type ListingDetail = {
  id: string
  sellerId: string
  title: string
  wasteType: string
  description: string | null
  quantity: number
  unit: string
  price: number
  acceptOffers: boolean
  imageUrl: string | null
  address: string | null
  city: string
  latitude: number | null
  longitude: number | null
  fulfillmentType: FulfillmentType
  status: ListingStatus
  createdAt: string
  seller: SellerProfile | null
}

export type ListingPin = {
  id: string
  title: string
  latitude: number
  longitude: number
  wasteType: string
}
