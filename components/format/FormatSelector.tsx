'use client'

import { useState } from 'react'
import { FORMAT_TEMPLATES, FormatTemplate } from '@/lib/format-templates'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Palette, 
  FileText, 
  Columns2, 
  AlignJustify,
  Sparkles,
  BookOpen,
} from 'lucide-react'

interface FormatSelectorProps {
  selectedFormat: string
  onFormatChange: (formatId: string) => void
  showCard?: boolean
}

const formatIcons: Record<string, React.ReactNode> = {
  'ieee-two-column': <Columns2 className="h-4 w-4" />,
  'ieee-single-column': <AlignJustify className="h-4 w-4" />,
  'apa-7th': <FileText className="h-4 w-4" />,
  'modern-clean': <Sparkles className="h-4 w-4" />,
  'classic-academic': <BookOpen className="h-4 w-4" />,
}

export function FormatSelector({ selectedFormat, onFormatChange, showCard = false }: FormatSelectorProps) {
  const currentFormat = FORMAT_TEMPLATES.find(f => f.id === selectedFormat)

  if (showCard) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Paper Format</CardTitle>
            <Badge variant="outline" className="text-xs font-normal">PDF Export</Badge>
          </div>
          <CardDescription className="text-sm">
            Choose a formatting style for your PDF export. The selected format will be applied when you export to PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {FORMAT_TEMPLATES.map((format) => (
              <button
                key={format.id}
                onClick={() => onFormatChange(format.id)}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all hover:border-primary/50 ${
                  selectedFormat === format.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/60 bg-card hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={selectedFormat === format.id ? 'text-primary' : 'text-muted-foreground'}>
                    {formatIcons[format.id]}
                  </span>
                  <span className="font-medium text-sm">{format.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{format.preview}</span>
              </button>
            ))}
          </div>
          {currentFormat && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
              <p><strong>Selected:</strong> {currentFormat.name}</p>
              <p>{currentFormat.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Compact dropdown version
  return (
    <div className="flex items-center gap-2">
      <Palette className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedFormat} onValueChange={onFormatChange}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Select format" />
        </SelectTrigger>
        <SelectContent>
          {FORMAT_TEMPLATES.map((format) => (
            <SelectItem key={format.id} value={format.id} className="text-xs">
              <div className="flex items-center gap-2">
                {formatIcons[format.id]}
                <span>{format.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Quick format switcher for the action bar
export function FormatSwitcher({ selectedFormat, onFormatChange }: FormatSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {FORMAT_TEMPLATES.slice(0, 3).map((format) => (
        <Button
          key={format.id}
          variant={selectedFormat === format.id ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => onFormatChange(format.id)}
          title={format.name}
        >
          {formatIcons[format.id]}
          <span className="hidden sm:inline">{format.name.split(' ')[0]}</span>
        </Button>
      ))}
      <Select value={selectedFormat} onValueChange={onFormatChange}>
        <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent">
          <span className="text-muted-foreground">•••</span>
        </SelectTrigger>
        <SelectContent align="end">
          {FORMAT_TEMPLATES.map((format) => (
            <SelectItem key={format.id} value={format.id} className="text-xs">
              <div className="flex items-center gap-2">
                {formatIcons[format.id]}
                <span>{format.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
