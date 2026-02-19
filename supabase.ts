// supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 'export'를 붙여야 다른 파일에서 import로 불러올 수 있어요!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)