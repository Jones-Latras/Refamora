import { createClient } from 'npm:@supabase/supabase-js@2'

type AuthenticatedUser = {
  id: string
}

export function getRequestClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim()
  const authHeader = req.headers.get('Authorization')

  if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })
}

export async function getAuthenticatedUser(req: Request): Promise<{
  user: AuthenticatedUser | null
  error: Error | null
}> {
  const supabase = getRequestClient(req)

  if (!supabase) {
    return { user: null, error: new Error('Unauthorized request.') }
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
  const supabase = getRequestClient(req)

  if (!supabase) {
    return { user: null, error: new Error('Unauthorized request.') }
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
