import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Anonymes Sign-in beim App-Start damit PostgREST ein gültiges JWT bekommt
supabase.auth.getSession().then(({ data }) => {
  if (!data.session) {
    supabase.auth.signInAnonymously()
  }
})
