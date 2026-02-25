import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazily-created singletons — avoids module-level instantiation during build
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

// Browser client (uses anon key, respects RLS)
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _supabase
}

// Server client (uses service role, bypasses RLS — use carefully)
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _supabaseAdmin
}

// Paper operations
export async function savePaper(paper: {
  user_id: string
  title: string
  topic: string
  domain: string
  citation_style: string
  word_count_target: number
  page_count: number
  content: string
  format_template?: string
}) {
  const { data, error } = await getSupabaseAdmin()
    .from('papers')
    .insert(paper)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserPapers(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('papers')
    .select('id, title, topic, domain, citation_style, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getPaperById(id: string, userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('papers')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updatePaper(id: string, content: string) {
  const { error } = await getSupabaseAdmin()
    .from('papers')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deletePaper(id: string) {
  const { error } = await getSupabaseAdmin()
    .from('papers')
    .delete()
    .eq('id', id)

  if (error) throw error
}
