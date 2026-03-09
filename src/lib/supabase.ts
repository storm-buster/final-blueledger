import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfcxivpkfyljsvcpztrl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmY3hpdnBrZnlsanN2Y3B6dHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Njg1ODgsImV4cCI6MjA4NzE0NDU4OH0.6nX6hKXwLxFyh0g4ynQQpzsTaL4LO89UudHT995fL5U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
