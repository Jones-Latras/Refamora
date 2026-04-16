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
  provider: z.enum(['local_gemma', 'gemini']),
  fallbackUsed: z.boolean(),
  result: listingAssistOutputSchema,
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type SignUpFormValues = z.infer<typeof signUpSchema>
export type ProfileFormValues = z.input<typeof profileSchema>
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>
export type ListingFormValues = z.input<typeof listingSchema>
export type ListingAssistFormValues = z.infer<typeof listingAssistInputSchema>
