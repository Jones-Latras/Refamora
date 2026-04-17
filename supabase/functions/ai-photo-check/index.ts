import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  getAIRateLimitStatus,
  logAIEvent,
} from '../_shared/aiEventLogger.ts'
import { checkListingPhoto } from '../_shared/aiService.ts'
import { getAuthenticatedFarmer } from '../_shared/auth.ts'
import type { PhotoCheckInput } from '../_shared/aiTypes.ts'

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
    feature: 'photo_quality_checker',
  })

  if (!rateLimit.allowed) {
    await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'photo_quality_checker',
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
        error: `Photo checker is busy right now. Please wait a few minutes and try again. Limit: ${rateLimit.limit} requests per ${rateLimit.windowMinutes} minutes.`,
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
  let input: PhotoCheckInput | null = null

  try {
    input = (await req.json()) as PhotoCheckInput
    const result = await checkListingPhoto(input)
    const latencyMs = Date.now() - startedAt
    const eventId = await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'photo_quality_checker',
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      requestStatus: 'success',
      latencyMs,
      metadata: {
        wasteType: input.wasteType,
        qualityScore: result.result.qualityScore,
        readiness: result.result.readiness,
        moderationStatus: result.result.moderationStatus,
        likelyWasteType: result.result.likelyWasteType,
        likelyWasteTypeConfidence: result.result.likelyWasteTypeConfidence,
      },
    })

    return new Response(
      JSON.stringify({
        ...result,
        eventId,
        latencyMs,
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
      error instanceof Error ? error.message : 'Photo quality check failed.'

    await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'photo_quality_checker',
      requestStatus: 'error',
      latencyMs,
      metadata: {
        errorMessage: message,
        wasteType: input?.wasteType ?? null,
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
