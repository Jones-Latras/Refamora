import { z } from 'zod'

import { WASTE_TYPES } from './wasteTypes'

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

export const signUpSchema = loginSchema
  .extend({
    fullName: z.string().min(2, 'Full name is required.'),
    phone: z.string().min(7, 'Phone number is required.'),
    confirmPassword: z.string().min(6, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name is required.'),
  phone: z.string().min(7, 'Phone number is required.'),
  city: z.string().min(2, 'City is required.'),
  avatar_url: z.string().url().nullable().optional(),
})

export const passwordChangeSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string().min(6, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

const wasteTypeValues = WASTE_TYPES.map((item) => item.value) as [
  string,
  ...string[],
]

export const listingSchema = z.object({
  title: z.string().min(3, 'Listing title is required.'),
  description: z.string().min(10, 'Add a short description.'),
  waste_type: z.enum(wasteTypeValues),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().min(1),
  unit: z.string().min(1),
  city: z.string().min(2),
  address: z.string().min(4, 'Add a pickup address.'),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  fulfillment_type: z.enum(['pickup', 'delivery', 'both']),
  accept_offers: z.boolean().default(false),
  image_url: z.string().nullable().optional(),
})

export const listingAssistInputSchema = z.object({
  title: z.string().min(1, 'Listing title is required.'),
  description: z.string().min(1, 'Add a short description.'),
  wasteType: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  city: z.string().nullable(),
  fulfillmentType: z.enum(['pickup', 'delivery', 'both']).nullable(),
  price: z.number().nullable(),
  imageBase64: z.string().nullable().optional(),
  imageMimeType: z.string().nullable().optional(),
})

export const wasteValueAdviceInputSchema = z.object({
  wasteType: z.string().min(1, 'Waste type is required.'),
  city: z.string().nullable(),
})

export const buyerSearchAssistInputSchema = z.object({
  query: z.string().min(3, 'Enter a more specific search request.'),
})

export const photoCheckInputSchema = z.object({
  imageBase64: z.string().min(1, 'Listing photo is required.'),
  imageMimeType: z.string().nullable(),
  wasteType: z.string().nullable(),
})

const inquiryAssistItemSchema = z.object({
  id: z.string().min(1),
  listingTitle: z.string().min(1),
  counterpartName: z.string().min(1),
  counterpartCity: z.string().nullable(),
  message: z.string().nullable(),
  status: z.enum(['pending', 'seen', 'responded']),
  createdAt: z.string().min(1),
})

export const listingModerationInputSchema = z.object({
  title: z.string().min(1, 'Listing title is required.'),
  description: z.string().min(1, 'Listing description is required.'),
  wasteType: z.string().nullable(),
  city: z.string().nullable(),
  price: z.number().nullable(),
  unit: z.string().nullable(),
  imageBase64: z.string().nullable().optional(),
  imageMimeType: z.string().nullable().optional(),
})

export const inquirySummaryInputSchema = z.object({
  inquiries: z.array(inquiryAssistItemSchema).min(1, 'At least one inquiry is required.'),
})

export const replyDraftInputSchema = z.object({
  inquiry: inquiryAssistItemSchema,
})

export const listingAssistOutputSchema = z.object({
  improvedTitle: z.string(),
  improvedDescription: z.string(),
  suggestedWasteType: z.string().nullable(),
  suggestedUnit: z.string().nullable(),
  missingFields: z.array(z.string()),
  publishReadiness: z.enum(['ready', 'needs_review']),
  notes: z.array(z.string()),
})

export const listingAssistResultSchema = z.object({
  eventId: z.string().uuid().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  provider: z.enum(['local_gemma', 'gemini']),
  fallbackUsed: z.boolean(),
  result: listingAssistOutputSchema,
})

export const wasteValueAdviceOutputSchema = z.object({
  uses: z.array(z.string()),
  cautions: z.array(z.string()),
  marketTip: z.string().nullable(),
  sourceBasis: z.array(z.string()),
})

export const wasteValueAdviceResultSchema = z.object({
  eventId: z.string().uuid().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  provider: z.enum(['local_gemma', 'gemini']),
  fallbackUsed: z.boolean(),
  result: wasteValueAdviceOutputSchema,
})

export const buyerSearchAssistOutputSchema = z.object({
  wasteType: z.string().nullable(),
  fulfillmentType: z.enum(['pickup', 'delivery', 'both']).nullable(),
  minPrice: z.number().nullable(),
  maxPrice: z.number().nullable(),
  search: z.string().nullable(),
  notes: z.array(z.string()),
})

export const buyerSearchAssistResultSchema = z.object({
  eventId: z.string().uuid().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  provider: z.enum(['local_gemma', 'gemini']),
  fallbackUsed: z.boolean(),
  result: buyerSearchAssistOutputSchema,
})

export const photoCheckOutputSchema = z.object({
  qualityScore: z.number().min(0).max(100),
  readiness: z.enum(['good', 'needs_review', 'retake']),
  retakeSuggestions: z.array(z.string()),
  likelyWasteType: z.string().nullable(),
  likelyWasteTypeConfidence: z
    .enum(['high', 'medium', 'low', 'unknown']),
  moderationStatus: z.enum(['clear', 'review']),
  notes: z.array(z.string()),
})

export const photoCheckResultSchema = z.object({
  eventId: z.string().uuid().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  provider: z.enum(['local_gemma', 'gemini']),
  fallbackUsed: z.boolean(),
  result: photoCheckOutputSchema,
})

export const listingModerationOutputSchema = z.object({
  decision: z.enum(['allow', 'review', 'block']),
  safeToPublish: z.boolean(),
  reasons: z.array(z.string()),
  fieldWarnings: z.array(z.string()),
  imageWarnings: z.array(z.string()),
})

export const listingModerationResultSchema = z.object({
  eventId: z.string().uuid().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  provider: z.enum(['local_gemma', 'gemini']),
  fallbackUsed: z.boolean(),
  queuedForReview: z.boolean(),
  reviewQueueId: z.string().uuid().nullable(),
  result: listingModerationOutputSchema,
})

export const inquirySummaryOutputSchema = z.object({
  summary: z.string(),
  priorityInquiryIds: z.array(z.string()),
  unansweredQuestions: z.array(z.string()),
  followUpTips: z.array(z.string()),
})

export const inquirySummaryResultSchema = z.object({
  eventId: z.string().uuid().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  provider: z.enum(['local_gemma', 'gemini']),
  fallbackUsed: z.boolean(),
  result: inquirySummaryOutputSchema,
})

export const replyDraftOutputSchema = z.object({
  draftReply: z.string(),
  tone: z.enum(['warm', 'direct', 'follow_up']),
  unansweredQuestions: z.array(z.string()),
  keyPoints: z.array(z.string()),
})

export const replyDraftResultSchema = z.object({
  eventId: z.string().uuid().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  provider: z.enum(['local_gemma', 'gemini']),
  fallbackUsed: z.boolean(),
  result: replyDraftOutputSchema,
})

export const aiFeedbackInputSchema = z.object({
  eventId: z.string().uuid(),
  feature: z.enum([
    'listing_copilot',
    'waste_value_advisor',
    'buyer_search_assistant',
    'listing_moderation',
    'photo_quality_checker',
    'messaging_support',
  ]),
  helpful: z.boolean(),
})

export const aiFeedbackResultSchema = z.object({
  eventId: z.string().uuid(),
  feature: z.enum([
    'listing_copilot',
    'waste_value_advisor',
    'buyer_search_assistant',
    'listing_moderation',
    'photo_quality_checker',
    'messaging_support',
  ]),
  helpful: z.boolean(),
})

export const aiHealthResultSchema = z.object({
  available: z.boolean(),
  primaryProvider: z.enum(['local_gemma', 'gemini']).nullable(),
  providers: z.array(
    z.object({
      provider: z.enum(['local_gemma', 'gemini']),
      enabled: z.boolean(),
      available: z.boolean(),
      message: z.string().nullable(),
    }),
  ),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type SignUpFormValues = z.infer<typeof signUpSchema>
export type ProfileFormValues = z.input<typeof profileSchema>
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>
export type ListingFormValues = z.input<typeof listingSchema>
export type ListingAssistFormValues = z.infer<typeof listingAssistInputSchema>
export type AIFeedbackFormValues = z.infer<typeof aiFeedbackInputSchema>
export type WasteValueAdviceFormValues = z.infer<typeof wasteValueAdviceInputSchema>
export type BuyerSearchAssistFormValues = z.infer<typeof buyerSearchAssistInputSchema>
export type PhotoCheckFormValues = z.infer<typeof photoCheckInputSchema>
export type ListingModerationFormValues = z.infer<
  typeof listingModerationInputSchema
>
export type InquirySummaryFormValues = z.infer<typeof inquirySummaryInputSchema>
export type ReplyDraftFormValues = z.infer<typeof replyDraftInputSchema>
