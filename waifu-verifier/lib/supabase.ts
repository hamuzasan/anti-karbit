// waifu-verifier/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

// Gunakan createBrowserClient agar aman di-import di Client maupun Server
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)