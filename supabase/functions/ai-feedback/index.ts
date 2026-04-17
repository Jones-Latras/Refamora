import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import { submitAIEventFeedback } from '../_shared/aiEventLogger.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import type { AIFeedbackInput } from '../_shared/aiTypes.ts'

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

  const body = (await req.json()) as AIFeedbackInput

  if (
    !body ||
    typeof body.eventId !== 'string' ||
    body.feature !== 'listing_copilot' ||
    typeof body.helpful !== 'boolean'
  ) {
    return new Response(JSON.stringify({ error: 'Invalid AI feedback payload.' }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }

  const result = await submitAIEventFeedback({
    req,
    userId: auth.user.id,
    eventId: body.eventId,
    feature: body.feature,
    helpful: body.helpful,
  })

  if (!result) {
    return new Response(JSON.stringify({ error: 'AI feedback record not found.' }), {
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
})
