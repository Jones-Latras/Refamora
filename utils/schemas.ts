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

export type LoginFormValues = z.infer<typeof loginSchema>
export type SignUpFormValues = z.infer<typeof signUpSchema>
export type ListingFormValues = z.input<typeof listingSchema>
