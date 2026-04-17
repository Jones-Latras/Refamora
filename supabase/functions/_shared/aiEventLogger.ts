import { getRequestClient } from './auth.ts'
import type {
  AIFeature,
  AIFeedbackResult,
  AIProvider,
} from './aiTypes.ts'

type LogAIEventInput = {
  req: Request
  userId: string
  feature: AIFeature
  provider?: AIProvider | null
  fallbackUsed?: boolean
  requestStatus: 'success' | 'error'
  latencyMs?: number | null
  metadata?: Record<string, unknown>
}

export async function logAIEvent({
  req,
  userId,
  feature,
  provider = null,
  fallbackUsed = false,
  requestStatus,
  latencyMs = null,
  metadata = {},
}: LogAIEventInput): Promise<string | null> {
  const supabase = getRequestClient(req)

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('ai_events')
    .insert({
      user_id: userId,
      feature,
      provider,
      fallback_used: fallbackUsed,
      request_status: requestStatus,
      latency_ms: latencyMs,
      metadata,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to log AI event', error.message)
    return null
  }

  return typeof data?.id === 'string' ? data.id : null
}

type SubmitAIEventFeedbackInput = {
  req: Request
  userId: string
  eventId: string
  feature: AIFeature
  helpful: boolean
}

export async function submitAIEventFeedback({
  req,
  userId,
  eventId,
  feature,
  helpful,
}: SubmitAIEventFeedbackInput): Promise<AIFeedbackResult | null> {
  const supabase = getRequestClient(req)

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('ai_events')
    .update({
      helpful,
    })
    .eq('id', eventId)
    .eq('user_id', userId)
    .eq('feature', feature)
    .select('id, feature, helpful')
    .single()

  if (error || !data || typeof data.helpful !== 'boolean') {
    console.error('Failed to submit AI feedback', error?.message ?? 'Unknown error')
    return null
  }

  return {
    eventId: data.id,
    feature,
    helpful: data.helpful,
  }
}
