import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import { logAIEvent } from '../_shared/aiEventLogger.ts'
import { assistListing } from '../_shared/aiService.ts'
import { getAuthenticatedFarmer } from '../_shared/auth.ts'
import type { ListingAssistInput } from '../_shared/aiTypes.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  const startedAt = Date.now()
  let input: ListingAssistInput | null = null

  try {
    input = (await req.json()) as ListingAssistInput
    const result = await assistListing(input)
    const latencyMs = Date.now() - startedAt
    const eventId = await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'listing_copilot',
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      requestStatus: 'success',
      latencyMs,
      metadata: {
        publishReadiness: result.result.publishReadiness,
        missingFieldCount: result.result.missingFields.length,
        hasImage: Boolean(input.imageBase64),
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
      error instanceof Error ? error.message : 'AI listing assist failed.'

    await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'listing_copilot',
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
