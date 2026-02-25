export interface Paper {
  id: string
  user_id: string
  title: string
  topic: string
  domain: string
  citation_style: 'IEEE' | 'APA' | 'MLA'
  word_count_target: number
  page_count: number
  content: string
  format_template?: string
  created_at: string
  updated_at: string
}

export interface GenerateFormOptions {
  topic: string
  domain: string
  citationStyle: 'IEEE' | 'APA' | 'MLA'
  wordCount: number
  pageCount: number
}

export type CitationStyle = 'IEEE' | 'APA' | 'MLA'

export type ExportFormat = 'pdf' | 'docx'

export interface AnalysisResult {
  overallScore: number
  readability: { score: number; feedback: string }
  academicTone: { score: number; feedback: string }
  structure: { score: number; feedback: string }
  grammar: { score: number; feedback: string }
  suggestions: string[]
}
