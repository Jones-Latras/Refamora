import type { UserRole } from '../types/app'
import type { Tables } from '../types/database'

type UserProfile = Tables<'users'>

export type ProfileCompletionItem = {
  key: 'full_name' | 'avatar_url' | 'phone' | 'city'
  label: string
  description: string
  done: boolean
}

export type ProfileCompletionState = {
  title: string
  summary: string
  completeLabel: string
  nextActionLabel: string
  items: ProfileCompletionItem[]
  completedCount: number
  remainingCount: number
  percent: number
  isComplete: boolean
  missingLabels: string[]
}

function hasText(value?: string | null) {
  return Boolean(value?.trim())
}

export function getProfileCompletion(
  profile: UserProfile | null | undefined,
  role: UserRole | null | undefined,
): ProfileCompletionState {
  const normalizedRole: UserRole = role === 'farmer' ? 'farmer' : 'buyer'

  const items: ProfileCompletionItem[] = [
    {
      key: 'full_name',
      label: 'Full name',
      description:
        normalizedRole === 'farmer'
          ? 'Use the name buyers will recognize when they contact you.'
          : 'Use the name sellers will recognize when you send requests.',
      done: hasText(profile?.full_name),
    },
    {
      key: 'avatar_url',
      label: 'Profile photo',
      description:
        normalizedRole === 'farmer'
          ? 'Add a clear photo so your seller profile feels more trustworthy.'
          : 'Add a photo so sellers can quickly recognize your account.',
      done: hasText(profile?.avatar_url),
    },
    {
      key: 'phone',
      label: 'Phone number',
      description:
        normalizedRole === 'farmer'
          ? 'Give buyers a reliable way to follow up about listings.'
          : 'Make it easier for sellers to reply when a match looks good.',
      done: hasText(profile?.phone),
    },
    {
      key: 'city',
      label: 'City',
      description:
        normalizedRole === 'farmer'
          ? 'Show buyers where your waste listings are based.'
          : 'Help the app surface nearby listings that fit your area.',
      done: hasText(profile?.city),
    },
  ]

  const completedCount = items.filter((item) => item.done).length
  const remainingCount = items.length - completedCount
  const isComplete = remainingCount === 0
  const percent = Math.round((completedCount / items.length) * 100)

  return {
    title: normalizedRole === 'farmer' ? 'Seller profile progress' : 'Buyer profile progress',
    summary:
      normalizedRole === 'farmer'
        ? 'Complete these details so buyers trust your listings faster.'
        : 'Complete these details so sellers know who they are responding to.',
    completeLabel:
      normalizedRole === 'farmer' ? 'Seller profile ready' : 'Buyer profile ready',
    nextActionLabel:
      normalizedRole === 'farmer' ? 'Finish profile' : 'Complete profile',
    items,
    completedCount,
    remainingCount,
    percent,
    isComplete,
    missingLabels: items.filter((item) => !item.done).map((item) => item.label),
  }
}
