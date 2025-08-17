import { createClient } from '@supabase/supabase-js'

// Only use Supabase if properly configured, otherwise use null
const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const envSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured (not placeholder values)
const isSupabaseConfigured = envSupabaseUrl && 
  envSupabaseKey && 
  envSupabaseUrl !== 'your_supabase_url_here' && 
  envSupabaseKey !== 'your_supabase_anon_key_here' &&
  envSupabaseUrl.startsWith('https://')

const supabaseUrl = isSupabaseConfigured ? envSupabaseUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = isSupabaseConfigured ? envSupabaseKey : 'placeholder-key'

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
}) : null

// Export the configuration status for components to check
export const isSupabaseEnabled = isSupabaseConfigured

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          created_at: string
          updated_at: string
          last_login: string | null
          email_verified: boolean
          preferences: {
            theme: 'light' | 'dark' | 'system'
            notifications: boolean
          }
          transcript_data: any | null
          academic_plan: any | null
          has_api_key: boolean
          api_key_updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          created_at?: string
          updated_at?: string
          last_login?: string | null
          email_verified?: boolean
          preferences?: {
            theme?: 'light' | 'dark' | 'system'
            notifications?: boolean
          }
          transcript_data?: any | null
          academic_plan?: any | null
          has_api_key?: boolean
          api_key_updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          created_at?: string
          updated_at?: string
          last_login?: string | null
          email_verified?: boolean
          preferences?: {
            theme?: 'light' | 'dark' | 'system'
            notifications?: boolean
          }
          transcript_data?: any | null
          academic_plan?: any | null
          has_api_key?: boolean
          api_key_updated_at?: string | null
        }
      }
      courses: {
        Row: {
          id: string
          course_code: string
          title: string
          description: string | null
          credits: number
          prerequisites: string[] | null
          department: string
          level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_code: string
          title: string
          description?: string | null
          credits: number
          prerequisites?: string[] | null
          department: string
          level: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_code?: string
          title?: string
          description?: string | null
          credits?: number
          prerequisites?: string[] | null
          department?: string
          level?: number
          created_at?: string
          updated_at?: string
        }
      }
      academic_plans: {
        Row: {
          id: string
          user_id: string
          plan_name: string
          major: string
          concentration: string | null
          graduation_date: string | null
          semesters: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_name: string
          major: string
          concentration?: string | null
          graduation_date?: string | null
          semesters: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_name?: string
          major?: string
          concentration?: string | null
          graduation_date?: string | null
          semesters?: any
          created_at?: string
          updated_at?: string
        }
      }
      transcripts: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string | null
          parsed_data: any
          processed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path?: string | null
          parsed_data: any
          processed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_path?: string | null
          parsed_data?: any
          processed_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}