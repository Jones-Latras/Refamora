import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  getAIRateLimitStatus,
  logAIEvent,
} from '../_shared/aiEventLogger.ts'
import { getAuthenticatedFarmer } from '../_shared/auth.ts'
import {
  draftInquiryReply,
  summarizeInquiries,
} from '../_shared/aiService.ts'
import type {
  InquirySummaryInput,
  ReplyDraftInput,
} from '../_shared/aiTypes.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type InquiryAssistRequest =
  | ({ action: 'summary' } & InquirySummaryInput)
  | ({ action: 'reply' } & ReplyDraftInput)

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
    feature: 'messaging_support',
  })

  if (!rateLimit.allowed) {
    await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'messaging_support',
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
        error: `Inquiry assistant is busy right now. Please wait a few minutes and try again. Limit: ${rateLimit.limit} requests per ${rateLimit.windowMinutes} minutes.`,
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
  let input: InquiryAssistRequest | null = null

  try {
    input = (await req.json()) as InquiryAssistRequest

    if (input.action === 'summary') {
      const result = await summarizeInquiries({
        inquiries: input.inquiries,
      })
      const latencyMs = Date.now() - startedAt
      const eventId = await logAIEvent({
        req,
        userId: auth.user.id,
        feature: 'messaging_support',
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        requestStatus: 'success',
        latencyMs,
        metadata: {
          action: 'summary',
          inquiryCount: input.inquiries.length,
          priorityCount: result.result.priorityInquiryIds.length,
          unansweredCount: result.result.unansweredQuestions.length,
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
    }

    const result = await draftInquiryReply({
      inquiry: input.inquiry,
    })
    const latencyMs = Date.now() - startedAt
    const eventId = await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'messaging_support',
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      requestStatus: 'success',
      latencyMs,
      metadata: {
        action: 'reply',
        inquiryId: input.inquiry.id,
        unansweredCount: result.result.unansweredQuestions.length,
        tone: result.result.tone,
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
      error instanceof Error ? error.message : 'Inquiry assistant failed.'

    await logAIEvent({
      req,
      userId: auth.user.id,
      feature: 'messaging_support',
      requestStatus: 'error',
      latencyMs,
      metadata: {
        errorMessage: message,
        action: input?.action ?? null,
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
