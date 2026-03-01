import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fjytqiciflasnipvabtl.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeXRxaWNpZmxhc25pcHZhYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODI1NDgsImV4cCI6MjA4Nzk1ODU0OH0.MZo-FC1-oq4v7putv7i0MAqIcdGc22uXpvmQLzeAVFE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface PlanHistoryRow {
  id: string;
  created_at: string;
  task: string;
  model: string;
  reasoning: string | null;
  plan: unknown;
  validation_passed: boolean;
  validation_error: string | null;
  token_usage: unknown | null;
  execution_success: boolean | null;
  final_world_state: unknown | null;
}
