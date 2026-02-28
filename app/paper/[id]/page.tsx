'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ContentAnalyzer } from '@/components/analyzer/ContentAnalyzer'
import { getFormatCss, wrapContentForFormat } from '@/lib/format-templates'
import { FormatSwitcher } from '@/components/format/FormatSelector'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileDown,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Calendar,
  Check,
  Palette,
} from 'lucide-react'
import type { Paper } from '@/types'

const TipTapEditor = dynamic(
  () => import('@/components/editor/TipTapEditor').then((m) => m.TipTapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] rounded-lg border bg-card animate-pulse" />
    ),
  }
)

export default function PaperPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState('ieee-two-column')

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const res = await fetch(`/api/papers/${id}`)
        if (!res.ok) throw new Error('Paper not found')
        const data = await res.json()
        setPaper(data)
        setContent(data.content)
        // Restore the format template used when the paper was saved
        if (data.format_template) {
          setSelectedFormat(data.format_template)
        }
      } catch (e) {
        setError('Could not load paper.')
        console.error(e)
      }
    }
    fetchPaper()
  }, [id])

  const handleSave = useCallback(async () => {
    if (!paper) return
    setIsSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/papers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError('Failed to save.')
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }, [id, paper, content])

  const handleDelete = async () => {
    if (!confirm('Delete this paper? This cannot be undone.')) return
    setIsDeleting(true)
    try {
      await fetch(`/api/papers/${id}`, { method: 'DELETE' })
      router.push('/dashboard')
    } catch {
      setError('Failed to delete.')
      setIsDeleting(false)
    }
  }

  const handleExportDocx = async () => {
    if (!content) return
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: paper?.title || 'paper', format: 'docx', formatId: selectedFormat }),
      })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${paper?.title || 'paper'}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('Export failed.')
      console.error(e)
    }
  }

  const handleExportPdf = () => {
    if (!content) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Use the saved format template CSS and content wrapping
    const formatCss = getFormatCss(selectedFormat)
    const wrappedContent = wrapContentForFormat(content, selectedFormat)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${paper?.title || 'Paper'}</title>
          <style>
            ${formatCss}
          </style>
        </head>
        <body>${wrappedContent}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const wordCount = content
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length

  if (error && !paper) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-lg font-medium text-destructive">{error}</p>
          <Button className="mt-6 gap-2" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </main>
    )
  }

  if (!paper) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-[600px] bg-card rounded-lg border" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back link */}
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight line-clamp-2">
              {paper.title}
            </h1>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className="text-xs">{paper.citation_style}</Badge>
              <Badge variant="secondary" className="text-xs">{paper.domain}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(paper.created_at).toLocaleDateString()}
              </span>
              {wordCount > 0 && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {wordCount.toLocaleString()} words
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1 mr-2 border-r pr-3">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <FormatSwitcher
                selectedFormat={selectedFormat}
                onFormatChange={setSelectedFormat}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5 text-xs">
              <FileDown className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportDocx} className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              DOCX
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              variant={saved ? 'outline' : 'default'}
              className="gap-1.5 text-xs shadow-sm"
            >
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5 text-xs"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-destructive">{error}</span>
          </div>
        )}

        {/* Editor */}
        <TipTapEditor content={content} onChange={setContent} />

        {/* AI Analyzer */}
        <ContentAnalyzer content={content} />

        {/* Bottom actions */}
        <div className="flex justify-end gap-2 pb-8">
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportDocx} className="gap-1.5">
            <FileText className="h-4 w-4" />
            Export DOCX
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-1.5 shadow-sm">
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  )
}
