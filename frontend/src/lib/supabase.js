import { createClient } from '@supabase/supabase-js'

// grab the keys from our environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key'

// create and export the client so any component can use it to talk to the db or handle auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
