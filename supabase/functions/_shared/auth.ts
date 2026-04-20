import { createClient } from 'npm:@supabase/supabase-js@2'

type AuthenticatedUser = {
  id: string
}

function getRequestConfig(req: Request) {
  return {
    supabaseUrl: Deno.env.get('SUPABASE_URL')?.trim() ?? '',
    supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')?.trim() ?? '',
    authHeader: req.headers.get('Authorization')?.trim() ?? '',
  }
}

export function getRequestClient(req: Request) {
  const { supabaseUrl, supabaseAnonKey, authHeader } = getRequestConfig(req)

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      client: null,
      error: new Error(
        'Function auth is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to the function runtime.',
      ),
    }
  }

  if (!authHeader) {
    return {
      client: null,
      error: new Error('Unauthorized request.'),
    }
  }

  return {
    client: createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }),
    error: null,
  }
}

export async function getAuthenticatedUser(req: Request): Promise<{
  user: AuthenticatedUser | null
  error: Error | null
}> {
  const { client: supabase, error: requestClientError } = getRequestClient(req)

  if (!supabase) {
    return {
      user: null,
      error: requestClientError ?? new Error('Unauthorized request.'),
    }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, error: new Error('Unauthorized request.') }
  }

  return {
    user: { id: user.id },
    error: null,
  }
}

export async function getAuthenticatedFarmer(req: Request): Promise<{
  user: AuthenticatedUser | null
  error: Error | null
}> {
  const { client: supabase, error: requestClientError } = getRequestClient(req)

  if (!supabase) {
    return {
      user: null,
      error: requestClientError ?? new Error('Unauthorized request.'),
    }
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, error: new Error('Unauthorized request.') }
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role !== 'farmer') {
    return {
      user: null,
      error: new Error('Only farmers can use listing assistance.'),
    }
  }

  return {
    user: { id: user.id },
    error: null,
  }
}
