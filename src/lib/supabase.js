import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://numdlqsfydtypeurijae.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bWRscXNmeWR0eXBldXJpamFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTIxNDYsImV4cCI6MjA4MzkyODE0Nn0.yN-No01tHXEMgemVfLF80iTXYdxMnHLZSO2rEJ-2Idk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
