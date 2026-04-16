import type {
  AIProvider,
  ListingAssistInput,
  ListingAssistResult,
} from './aiTypes.ts'

import { geminiProvider } from './providers/geminiProvider.ts'
import { localGemmaProvider } from './providers/localGemmaProvider.ts'

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
