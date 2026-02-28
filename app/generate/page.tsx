'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { GenerateForm } from '@/components/paper-form/GenerateForm'
import { ContentAnalyzer } from '@/components/analyzer/ContentAnalyzer'
import { FormatSelector, FormatSwitcher } from '@/components/format/FormatSelector'
import { getFormatCss, wrapContentForFormat } from '@/lib/format-templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  FileDown,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  X,
  LetterText,
  Palette,
} from 'lucide-react'

const TipTapEditor = dynamic(
  () => import('@/components/editor/TipTapEditor').then((m) => m.TipTapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] rounded-lg border bg-card animate-pulse" />
    ),
  }
)

export default function GeneratePage() {
  const router = useRouter()
  const errorRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [paperContent, setPaperContent] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('ieee-two-column')
  const [generationOptions, setGenerationOptions] = useState<{
    topic: string
    domain: string
    citationStyle: string
    wordCount: number
    pageCount: number
    authors: { name: string; registerNumber: string }[]
    affiliation: string
    department: string
    college: string
    proposedIdea: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])

  const handleGenerate = useCallback(
    async (options: {
      topic: string
      domain: string
      citationStyle: string
      wordCount: number
      pageCount: number
      authors: { name: string; registerNumber: string }[]
      affiliation: string
      department: string
      college: string
      proposedIdea: string
    }) => {
      setIsGenerating(true)
      setError(null)
      setPaperContent('')
      setEditedContent('')
      setGenerationOptions(options)
      setWordCount(0)

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || 'Failed to generate paper')
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let fullContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullContent += chunk
          setPaperContent(fullContent)
          setWordCount(
            fullContent
              .replace(/<[^>]+>/g, ' ')
              .split(/\s+/)
              .filter(Boolean).length
          )
        }

        setEditedContent(fullContent)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  const handleSave = async () => {
    if (!editedContent || !generationOptions) return
    setIsSaving(true)
    setError(null)

    try {
      const titleMatch = editedContent.match(/<h1[^>]*>(?:Title:\s*)?(.*?)<\/h1>/i)
      const title = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
        : generationOptions.topic

      const response = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          topic: generationOptions.topic,
          domain: generationOptions.domain,
          citation_style: generationOptions.citationStyle,
          word_count_target: generationOptions.wordCount,
          page_count: generationOptions.pageCount,
          content: editedContent,
          format_template: selectedFormat,
        }),
      })

      if (!response.ok) throw new Error('Failed to save paper')

      const { id } = await response.json()
      router.push(`/paper/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportDocx = async () => {
    if (!editedContent) return
    try {
      const titleMatch = editedContent.match(/<h1[^>]*>(?:Title:\s*)?(.*?)<\/h1>/i)
      const title = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
        : 'paper'

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent, title, format: 'docx', formatId: selectedFormat }),
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const handleExportPdf = () => {
    if (!editedContent) return
    const titleMatch = editedContent.match(/<h1[^>]*>(?:Title:\s*)?(.*?)<\/h1>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Paper'
    
    // Get CSS for selected format and wrap content appropriately
    const formatCss = getFormatCss(selectedFormat)
    const wrappedContent = wrapContentForFormat(editedContent, selectedFormat)
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>${formatCss}</style>
</head>
<body>${wrappedContent}</body>
</html>`
    
    // Use a hidden iframe to trigger print on the same page
    let iframe = document.getElementById('pdf-print-frame') as HTMLIFrameElement | null
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'pdf-print-frame'
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = 'none'
      document.body.appendChild(iframe)
    }
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return
    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()
    
    // Wait for content to render then trigger print
    setTimeout(() => {
      iframe!.contentWindow?.print()
    }, 500)
  }

  const estimatedPages = generationOptions
    ? Math.round(wordCount / 850)
    : 0

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Generate Paper</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure your paper and let AI write a complete academic journal article.
          </p>
        </div>

        {/* Form */}
        <GenerateForm onGenerate={handleGenerate} isLoading={isGenerating} />

        {/* Format Selection */}
        <FormatSelector
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
          showCard
        />

        {/* Error */}
        {error && (
          <div
            ref={errorRef}
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          >
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Something went wrong</p>
              <p className="text-sm text-muted-foreground mt-0.5 break-words">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Streaming progress */}
        {isGenerating && (
          <Card className="border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3 p-4">
              <div className="relative">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  AI is writing your paper...
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {wordCount.toLocaleString()} words
                  </span>
                  {generationOptions && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        ~{estimatedPages} of {generationOptions.pageCount} pages
                      </span>
                    </>
                  )}
                </div>
              </div>
              {generationOptions && (
                <div className="hidden sm:block">
                  <div className="w-32 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (wordCount / generationOptions.wordCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Editor + Actions */}
        {(paperContent || isGenerating) && (
          <div className="space-y-4">
            {/* Actions bar */}
            {!isGenerating && paperContent && (
              <div className="flex items-center justify-between flex-wrap gap-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="gap-1 font-mono text-xs">
                    <LetterText className="h-3 w-3" />
                    {wordCount.toLocaleString()} words
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    ~{estimatedPages} pages
                  </Badge>
                  {generationOptions && (
                    <>
                      <Badge variant="outline" className="text-xs">{generationOptions.citationStyle}</Badge>
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex">{generationOptions.domain}</Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Format switcher */}
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
                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 text-xs shadow-sm">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        Save Paper
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <TipTapEditor content={paperContent} onChange={setEditedContent} />

            {/* AI Analyzer */}
            {!isGenerating && paperContent && (
              <ContentAnalyzer content={editedContent || paperContent} />
            )}

            {/* Bottom actions */}
            {!isGenerating && paperContent && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-4 pb-8">
                {/* Mobile format selector */}
                <div className="md:hidden">
                  <FormatSelector
                    selectedFormat={selectedFormat}
                    onFormatChange={setSelectedFormat}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
                    <FileDown className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportDocx} className="gap-1.5">
                    <FileText className="h-4 w-4" />
                    Export DOCX
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving} className="gap-1.5 shadow-sm">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save to Dashboard
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
