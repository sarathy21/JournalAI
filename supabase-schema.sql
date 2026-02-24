-- ============================================
-- JournalAI — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Create papers table
CREATE TABLE IF NOT EXISTS papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  domain TEXT DEFAULT 'Computer Science',
  citation_style TEXT DEFAULT 'IEEE',
  word_count_target INT DEFAULT 2000,
  page_count INT DEFAULT 5,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_papers_user_id ON papers(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- Policy: service_role can do everything (our API uses service_role key)
-- No RLS policy needed for service_role — it bypasses RLS by default

-- Optional: If you want anon/authenticated users to also query their own papers:
CREATE POLICY "Users can view own papers" ON papers
  FOR SELECT USING (user_id = coalesce(current_setting('request.jwt.claims', true)::json->>'sub', '')::text);

CREATE POLICY "Users can insert own papers" ON papers
  FOR INSERT WITH CHECK (user_id = coalesce(current_setting('request.jwt.claims', true)::json->>'sub', '')::text);

CREATE POLICY "Users can update own papers" ON papers
  FOR UPDATE USING (user_id = coalesce(current_setting('request.jwt.claims', true)::json->>'sub', '')::text);

CREATE POLICY "Users can delete own papers" ON papers
  FOR DELETE USING (user_id = coalesce(current_setting('request.jwt.claims', true)::json->>'sub', '')::text);
