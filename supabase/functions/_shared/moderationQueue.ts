import { getRequestClient } from './auth.ts'
import type { ListingModerationInput } from './aiTypes.ts'

type QueueModerationReviewInput = {
  req: Request
  sellerId: string
  aiEventId: string | null
  moderation: {
    decision: 'review' | 'block'
    reasons: string[]
    fieldWarnings: string[]
    imageWarnings: string[]
  }
  listing: ListingModerationInput
}

export async function queueModerationReview({
  req,
  sellerId,
  aiEventId,
  moderation,
  listing,
}: QueueModerationReviewInput): Promise<string | null> {
  const { client: supabase } = getRequestClient(req)

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('listing_review_queue')
    .insert({
      seller_id: sellerId,
      ai_event_id: aiEventId,
      decision: moderation.decision,
      queue_status: 'pending',
      title: listing.title,
      waste_type: listing.wasteType,
      city: listing.city,
      reasons: moderation.reasons,
      field_warnings: moderation.fieldWarnings,
      image_warnings: moderation.imageWarnings,
      listing_snapshot: {
        title: listing.title,
        description: listing.description,
        wasteType: listing.wasteType,
        city: listing.city,
        price: listing.price,
        unit: listing.unit,
        hasImage: Boolean(listing.imageBase64),
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to queue moderation review', error.message)
    return null
  }

  return typeof data?.id === 'string' ? data.id : null
}
