import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  getAIRateLimitStatus,
  logAIEvent,
} from '../_shared/aiEventLogger.ts'
import { getAuthenticatedFarmer } from '../_shared/auth.ts'
import { queueModerationReview } from '../_shared/moderationQueue.ts'
import { moderateListing } from '../_shared/aiService.ts'
import type { ListingModerationInput } from '../_shared/aiTypes.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }

  const auth = await getAuthenticatedFarmer(req)

  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error.message }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }

  const rateLimit = await getAIRateLimitStatus({
    req,
    userId: auth.user.id,
    feature: 'listing_moderation',
  })

  if (!rateLimit.allowed) {
    await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'listing_moderation',
      requestStatus: 'error',
      metadata: {
        rateLimited: true,
        limit: rateLimit.limit,
        windowMinutes: rateLimit.windowMinutes,
        recentRequestCount: rateLimit.recentRequestCount,
      },
    })

    return new Response(
      JSON.stringify({
        error: `Listing moderation is busy right now. Please wait a few minutes and try again. Limit: ${rateLimit.limit} requests per ${rateLimit.windowMinutes} minutes.`,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      },
    )
  }

  const startedAt = Date.now()
  let input: ListingModerationInput | null = null

  try {
    input = (await req.json()) as ListingModerationInput
    const result = await moderateListing(input)
    const latencyMs = Date.now() - startedAt
    const eventId = await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'listing_moderation',
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      requestStatus: 'success',
      latencyMs,
      metadata: {
        decision: result.result.decision,
        safeToPublish: result.result.safeToPublish,
        reasonCount: result.result.reasons.length,
        fieldWarningCount: result.result.fieldWarnings.length,
        imageWarningCount: result.result.imageWarnings.length,
        hasImage: Boolean(input.imageBase64),
      },
    })
    const shouldQueue =
      result.result.decision === 'review' || result.result.decision === 'block'
    const reviewQueueId = shouldQueue
      ? await queueModerationReview({
          req,
          sellerId: auth.user.id,
          aiEventId: eventId,
          moderation: {
            decision: result.result.decision,
            reasons: result.result.reasons,
            fieldWarnings: result.result.fieldWarnings,
            imageWarnings: result.result.imageWarnings,
          },
          listing: input,
        })
      : null

    return new Response(
      JSON.stringify({
        ...result,
        eventId,
        latencyMs,
        queuedForReview: Boolean(reviewQueueId),
        reviewQueueId,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    const latencyMs = Date.now() - startedAt
    const message =
      error instanceof Error ? error.message : 'Listing moderation failed.'

    await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'listing_moderation',
      requestStatus: 'error',
      latencyMs,
      metadata: {
        errorMessage: message,
        hasImage: Boolean(input?.imageBase64),
      },
    })

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})
