import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://grlyhylqbekhrmfwgyme.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybHloeWxxYmVraHJtZndneW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc3MDEsImV4cCI6MjA3NTAwMzcwMX0.ZLulmspi7qsZhTSCCi69oV8HCgqVVuHOtd-D2AjJ9Zg"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)