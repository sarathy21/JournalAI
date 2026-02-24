'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Search,
  Loader2,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  BookOpen,
  PenLine,
  LayoutList,
  SpellCheck,
} from 'lucide-react'
import type { AnalysisResult } from '@/types'

interface ContentAnalyzerProps {
  content: string
}

const categoryIcons: Record<string, React.ReactNode> = {
  Readability: <BookOpen className="h-4 w-4" />,
  'Academic Tone': <PenLine className="h-4 w-4" />,
  Structure: <LayoutList className="h-4 w-4" />,
  'Grammar & Language': <SpellCheck className="h-4 w-4" />,
}

function ScoreBar({ score, label, feedback }: { score: number; label: string; feedback: string }) {
  const color =
    score >= 80
      ? 'bg-emerald-500'
      : score >= 60
        ? 'bg-amber-500'
        : score >= 40
          ? 'bg-orange-500'
          : 'bg-red-500'

  const textColor =
    score >= 80
      ? 'text-emerald-600'
      : score >= 60
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          {categoryIcons[label]}
          {label}
        </span>
        <span className={`font-mono font-semibold ${textColor}`}>
          {score}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{feedback}</p>
    </div>
  )
}

export function ContentAnalyzer({ content }: ContentAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!content || content.trim().length < 50) {
      setError('Content is too short to analyze.')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data: AnalysisResult = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base inline-flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            AI Content Analyzer
          </CardTitle>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5" />
                Analyze Paper
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!result && !isAnalyzing && !error && (
          <p className="text-sm text-muted-foreground">
            Click &quot;Analyze Paper&quot; to get an AI-powered assessment of readability, academic tone, structure, and grammar.
          </p>
        )}

        {isAnalyzing && (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        )}

        {result && (
          <div className="space-y-5">
            {/* Overall Score */}
            <div className="text-center p-5 bg-muted/50 rounded-xl">
              <div className="text-4xl font-bold mb-1">
                <span
                  className={
                    result.overallScore >= 80
                      ? 'text-emerald-600'
                      : result.overallScore >= 60
                        ? 'text-amber-600'
                        : 'text-red-600'
                  }
                >
                  {result.overallScore}
                </span>
                <span className="text-lg text-muted-foreground font-normal">/100</span>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Overall Quality Score
              </p>
            </div>

            {/* Score Bars */}
            <div className="space-y-4">
              <ScoreBar score={result.readability.score} label="Readability" feedback={result.readability.feedback} />
              <ScoreBar score={result.academicTone.score} label="Academic Tone" feedback={result.academicTone.feedback} />
              <ScoreBar score={result.structure.score} label="Structure" feedback={result.structure.feedback} />
              <ScoreBar score={result.grammar.score} label="Grammar & Language" feedback={result.grammar.feedback} />
            </div>

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="space-y-2 pt-1">
                <h4 className="font-medium text-sm inline-flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Improvement Suggestions
                </h4>
                <ul className="space-y-1.5">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2 leading-relaxed">
                      <span className="text-primary shrink-0 mt-0.5">&#8250;</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
