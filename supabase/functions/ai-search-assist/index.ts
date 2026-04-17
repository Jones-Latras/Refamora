import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  getAIRateLimitStatus,
  logAIEvent,
} from '../_shared/aiEventLogger.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { parseBuyerSearch } from '../_shared/aiService.ts'
import type { BuyerSearchAssistInput } from '../_shared/aiTypes.ts'

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

  const auth = await getAuthenticatedUser(req)

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
    feature: 'buyer_search_assistant',
  })

  if (!rateLimit.allowed) {
    await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'buyer_search_assistant',
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
        error: `Search assistant is busy right now. Please wait a few minutes and try again. Limit: ${rateLimit.limit} requests per ${rateLimit.windowMinutes} minutes.`,
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
  let input: BuyerSearchAssistInput | null = null

  try {
    input = (await req.json()) as BuyerSearchAssistInput
    const result = await parseBuyerSearch(input)
    const latencyMs = Date.now() - startedAt
    const eventId = await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'buyer_search_assistant',
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      requestStatus: 'success',
      latencyMs,
      metadata: {
        query: input.query,
        wasteType: result.result.wasteType,
        fulfillmentType: result.result.fulfillmentType,
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
      error instanceof Error ? error.message : 'Buyer search assistant failed.'

    await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'buyer_search_assistant',
      requestStatus: 'error',
      latencyMs,
      metadata: {
        errorMessage: message,
        query: input?.query ?? null,
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
