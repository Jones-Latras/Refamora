export type UserRole = 'farmer' | 'buyer' | 'admin'
export type AppEnvironment = 'development' | 'staging' | 'production'

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
  latitude: number | null
  longitude: number | null
  imageUrl: string | null
  status: ListingStatus
  sellerName: string | null
  sellerVerified: boolean
  fulfillmentType: FulfillmentType
  createdAt: string
}

export type SellerProfile = {
  id: string
  fullName: string
  city: string | null
  avatarUrl: string | null
  phone: string | null
  isVerified: boolean
  profileCompletionPercent: number
  isProfileComplete: boolean
  listingCount: number | null
  respondedInquiryCount: number | null
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

export type ListingPerformanceSummary = {
  listingId: string
  viewCount: number
  inquiryCount: number
  pendingInquiryCount: number
  respondedInquiryCount: number
  lastInquiryAt: string | null
}

export type ListingActivityItem = {
  id: string
  listingId: string
  type: 'listing_created' | 'listing_viewed' | 'inquiry_received'
  createdAt: string
  title: string
  description: string
}

export type ContactRequestSummary = {
  id: string
  listingId: string
  listingTitle: string
  listingImageUrl: string | null
  buyerId: string
  buyerLastReadAt: string | null
  sellerId: string
  counterpartName: string
  counterpartAvatarUrl: string | null
  counterpartPhone: string | null
  counterpartCity: string | null
  message: string | null
  messageCount: number
  lastMessageSenderId: string | null
  status: 'pending' | 'seen' | 'responded'
  createdAt: string
  updatedAt: string
}

export type ContactRequestMessage = {
  id: string
  requestId: string
  senderId: string
  message: string
  createdAt: string
}

export type ContactConversation = {
  request: ContactRequestSummary
  messages: ContactRequestMessage[]
}

export type UserNotificationKind =
  | 'inquiry_received'
  | 'reply_received'
  | 'verification_approved'
  | 'verification_rejected'

export type UserNotificationEntityType =
  | 'contact_request'
  | 'seller_verification_request'

export type UserNotification = {
  id: string
  userId: string
  kind: UserNotificationKind
  title: string
  body: string
  entityType: UserNotificationEntityType | null
  entityId: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export type AppRuntimePolicy = {
  id: string
  environment: AppEnvironment
  minimumSupportedVersion: string
  isEnforced: boolean
  updateMessage: string | null
  iosStoreUrl: string | null
  androidStoreUrl: string | null
  updatedAt: string
}

export type CrashReportSource = 'react_error_boundary' | 'global_js_handler'

export type CrashReportSeverity = 'error' | 'fatal'

export type InquiryAssistItem = {
  id: string
  listingTitle: string
  counterpartName: string
  counterpartCity: string | null
  message: string | null
  status: 'pending' | 'seen' | 'responded'
  createdAt: string
}

export type AIProvider = 'groq_text' | 'groq_vision'
export type AIFeature =
  | 'listing_copilot'
  | 'waste_value_advisor'
  | 'buyer_search_assistant'
  | 'listing_moderation'
  | 'photo_quality_checker'
  | 'messaging_support'

export type ListingAssistInput = {
  title: string
  description: string
  wasteType: string | null
  quantity: number | null
  unit: string | null
  city: string | null
  fulfillmentType: FulfillmentType | null
  price: number | null
  imageBase64?: string | null
  imageMimeType?: string | null
}

export type WasteValueAdviceInput = {
  wasteType: string
  city: string | null
}

export type WasteValueAdviceOutput = {
  uses: string[]
  cautions: string[]
  marketTip: string | null
  sourceBasis: string[]
}

export type ListingAssistOutput = {
  improvedTitle: string
  improvedDescription: string
  suggestedWasteType: string | null
  suggestedUnit: string | null
  missingFields: string[]
  publishReadiness: 'ready' | 'needs_review'
  notes: string[]
}

export type ListingAssistResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: ListingAssistOutput
}

export type WasteValueAdviceResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: WasteValueAdviceOutput
}

export type BuyerSearchAssistInput = {
  query: string
}

export type BuyerSearchAssistOutput = {
  wasteType: string | null
  fulfillmentType: FulfillmentType | null
  minPrice: number | null
  maxPrice: number | null
  search: string | null
  notes: string[]
}

export type BuyerSearchAssistResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: BuyerSearchAssistOutput
}

export type PhotoCheckInput = {
  imageBase64: string
  imageMimeType: string | null
  wasteType: string | null
}

export type ListingModerationInput = {
  title: string
  description: string
  wasteType: string | null
  city: string | null
  price: number | null
  unit: string | null
  imageBase64?: string | null
  imageMimeType?: string | null
}

export type InquirySummaryInput = {
  inquiries: InquiryAssistItem[]
}

export type ReplyDraftInput = {
  inquiry: InquiryAssistItem
}

export type PhotoCheckOutput = {
  qualityScore: number
  readiness: 'good' | 'needs_review' | 'retake'
  retakeSuggestions: string[]
  likelyWasteType: string | null
  likelyWasteTypeConfidence: 'high' | 'medium' | 'low' | 'unknown'
  moderationStatus: 'clear' | 'review'
  notes: string[]
}

export type ListingModerationOutput = {
  decision: 'allow' | 'review' | 'block'
  safeToPublish: boolean
  reasons: string[]
  fieldWarnings: string[]
  imageWarnings: string[]
}

export type InquirySummaryOutput = {
  summary: string
  priorityInquiryIds: string[]
  unansweredQuestions: string[]
  followUpTips: string[]
}

export type ReplyDraftOutput = {
  draftReply: string
  tone: 'warm' | 'direct' | 'follow_up'
  unansweredQuestions: string[]
  keyPoints: string[]
}

export type PhotoCheckResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: PhotoCheckOutput
}

export type ListingModerationResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  queuedForReview: boolean
  reviewQueueId: string | null
  result: ListingModerationOutput
}

export type InquirySummaryResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: InquirySummaryOutput
}

export type ReplyDraftResult = {
  eventId: string | null
  latencyMs: number | null
  provider: AIProvider
  fallbackUsed: boolean
  result: ReplyDraftOutput
}

export type AIFeedbackInput = {
  eventId: string
  feature: AIFeature
  helpful: boolean
}

export type AIFeedbackResult = {
  eventId: string
  feature: AIFeature
  helpful: boolean
}

export type AIProviderHealth = {
  provider: AIProvider
  enabled: boolean
  available: boolean
  message: string | null
}

export type AIHealthResult = {
  available: boolean
  primaryProvider: AIProvider | null
  providers: AIProviderHealth[]
}

export type SellerVerificationDocumentType =
  | 'government_id'
  | 'farm_id'
  | 'business_permit'
  | 'cooperative_certificate'
  | 'other'

export type SellerVerificationRequestStatus = 'pending' | 'approved' | 'rejected'

export type SellerVerificationRequest = {
  id: string
  sellerId: string
  documentType: SellerVerificationDocumentType
  documentNumber: string
  notes: string | null
  documentPath: string
  status: SellerVerificationRequestStatus
  adminNote: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AIAnalyticsSummary = {
  feature: AIFeature
  periodDays: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageLatencyMs: number | null
  helpfulRate: number | null
  feedbackCount: number
  groqTextRequests: number
  lastUsedAt: string | null
}

export type MarketplaceAnalyticsBreakdownItem = {
  label: string
  count: number
}

export type MarketplaceAnalyticsSummary = {
  periodDays: number
  totalUsers: number
  totalFarmers: number
  totalBuyers: number
  verifiedSellerCount: number
  activeListings: number
  soldListings: number
  unavailableListings: number
  totalListingViews: number
  totalInquiries: number
  respondedInquiries: number
  recentSignUps: number
  recentListings: number
  recentInquiries: number
  inquiryConversionRate: number | null
  sellerResponseRate: number | null
  topWasteTypes: MarketplaceAnalyticsBreakdownItem[]
  topCities: MarketplaceAnalyticsBreakdownItem[]
}

export type AdminListingSummary = {
  id: string
  sellerId: string
  title: string
  wasteType: string
  city: string | null
  status: ListingStatus
  imageUrl: string | null
}

export type AdminUserSummary = {
  id: string
  fullName: string
  email: string | null
  city: string | null
}

export type AdminListingReportStatus = 'pending' | 'reviewed' | 'dismissed'

export type AdminReviewQueueStatus = 'pending' | 'resolved' | 'dismissed'

export type AdminAuditActionType =
  | 'listing_report_updated'
  | 'review_queue_updated'
  | 'listing_status_updated'
  | 'seller_verification_updated'

export type AdminAuditEntityType =
  | 'listing_report'
  | 'listing_review_queue'
  | 'listing'
  | 'seller_verification_request'

export type AdminListingReportItem = {
  id: string
  listingId: string
  reason: string
  details: string | null
  status: AdminListingReportStatus
  createdAt: string
  adminNote: string | null
  reviewedAt: string | null
  listing: AdminListingSummary | null
  reporter: AdminUserSummary | null
  seller: AdminUserSummary | null
}

export type AdminModerationQueueItem = {
  id: string
  listingId: string | null
  decision: 'review' | 'block'
  queueStatus: AdminReviewQueueStatus
  title: string
  wasteType: string | null
  city: string | null
  createdAt: string
  updatedAt: string
  adminNote: string | null
  reviewedAt: string | null
  reasons: string[]
  fieldWarnings: string[]
  imageWarnings: string[]
  listing: AdminListingSummary | null
  seller: AdminUserSummary | null
}

export type AdminSellerVerificationItem = {
  id: string
  sellerId: string
  documentType: SellerVerificationDocumentType
  documentNumber: string
  notes: string | null
  documentPath: string
  status: SellerVerificationRequestStatus
  adminNote: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  seller: AdminUserSummary | null
}

export type AdminAuditLogItem = {
  id: string
  adminId: string
  actionType: AdminAuditActionType
  entityType: AdminAuditEntityType
  entityId: string
  metadata: Record<string, unknown>
  createdAt: string
  admin: AdminUserSummary | null
}

export type AdminCrashReportItem = {
  id: string
  userId: string | null
  source: CrashReportSource
  severity: CrashReportSeverity
  message: string
  stack: string | null
  componentStack: string | null
  route: string | null
  appEnv: AppEnvironment
  appVersion: string | null
  platform: string
  metadata: Record<string, unknown>
  createdAt: string
  user: AdminUserSummary | null
}
