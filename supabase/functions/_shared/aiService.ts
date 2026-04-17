import type {
  AIProvider,
  AIHealthResult,
  ListingAssistInput,
  ListingAssistResult,
  WasteValueAdviceInput,
  WasteValueAdviceResult,
} from './aiTypes.ts'

import {
  checkGeminiHealth,
  geminiProvider,
} from './providers/geminiProvider.ts'
import {
  checkLocalGemmaHealth,
  localGemmaProvider,
} from './providers/localGemmaProvider.ts'

function isEnabled(value: string | undefined, fallback: boolean) {
  if (value == null) {
    return fallback
  }

  return value.trim().toLowerCase() === 'true'
}

function getProviderOrder(): AIProvider[] {
  const localEnabled = isEnabled(Deno.env.get('LOCAL_GEMMA_ENABLED'), true)
  const geminiEnabled = isEnabled(Deno.env.get('GEMINI_ENABLED'), false)

  const providers: AIProvider[] = []

  if (localEnabled) {
    providers.push('local_gemma')
  }

  if (geminiEnabled) {
    providers.push('gemini')
  }

  return providers
}

export function isProviderEnabled(provider: AIProvider) {
  if (provider === 'local_gemma') {
    return isEnabled(Deno.env.get('LOCAL_GEMMA_ENABLED'), true)
  }

  return isEnabled(Deno.env.get('GEMINI_ENABLED'), false)
}

export async function assistListing(
  input: ListingAssistInput,
): Promise<ListingAssistResult> {
  const order = getProviderOrder()

  if (order.length === 0) {
    throw new Error('No AI providers are enabled.')
  }

  const errors: string[] = []

  for (let index = 0; index < order.length; index += 1) {
    const provider = order[index]

    try {
      const result =
        provider === 'local_gemma'
          ? await localGemmaProvider.assistListing(input)
          : await geminiProvider.assistListing(input)

      return {
        provider,
        fallbackUsed: index > 0,
        result,
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : 'Unknown provider error.'}`,
      )
    }
  }

  throw new Error(errors.join(' | '))
}

export async function adviseWasteValue(
  input: WasteValueAdviceInput,
): Promise<WasteValueAdviceResult> {
  const order = getProviderOrder()

  if (order.length === 0) {
    throw new Error('No AI providers are enabled.')
  }

  const errors: string[] = []

  for (let index = 0; index < order.length; index += 1) {
    const provider = order[index]

    try {
      const result =
        provider === 'local_gemma'
          ? await localGemmaProvider.adviseWasteValue(input)
          : await geminiProvider.adviseWasteValue(input)

      return {
        eventId: null,
        latencyMs: null,
        provider,
        fallbackUsed: index > 0,
        result,
      }
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : 'Unknown provider error.'}`,
      )
    }
  }

  throw new Error(errors.join(' | '))
}

export async function getAIHealth(): Promise<AIHealthResult> {
  const localEnabled = isProviderEnabled('local_gemma')
  const geminiEnabled = isProviderEnabled('gemini')

  const providers = await Promise.all([
    localEnabled
      ? checkLocalGemmaHealth()
      : Promise.resolve({
          provider: 'local_gemma' as const,
          enabled: false,
          available: false,
          message: 'Local Gemma is disabled.',
        }),
    geminiEnabled
      ? checkGeminiHealth()
      : Promise.resolve({
          provider: 'gemini' as const,
          enabled: false,
          available: false,
          message: 'Gemini fallback is disabled.',
        }),
  ])

  const ordered = getProviderOrder()
  const primaryProvider =
    ordered.find((provider) =>
      providers.some(
        (item) => item.provider === provider && item.enabled && item.available,
      ),
    ) ?? null

  return {
    available: providers.some((provider) => provider.enabled && provider.available),
    primaryProvider,
    providers,
  }
}
