'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, FileText, BookOpen, GraduationCap } from 'lucide-react'

interface GenerateFormProps {
  onGenerate: (options: {
    topic: string
    domain: string
    citationStyle: string
    wordCount: number
    pageCount: number
  }) => void
  isLoading: boolean
}

export function GenerateForm({ onGenerate, isLoading }: GenerateFormProps) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [domain, setDomain] = useState('Computer Science')
  const [citationStyle, setCitationStyle] = useState('IEEE')
  const [pageCount, setPageCount] = useState(10)

  const wordCount = pageCount * 600

  const handleSubmit = () => {
    if (!topic.trim() || topic.trim().length < 5) return
    const fullTopic = description.trim()
      ? `${topic.trim()}. Additional details: ${description.trim()}`
      : topic.trim()
    onGenerate({ topic: fullTopic, domain, citationStyle, wordCount, pageCount })
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Configure Your Paper</CardTitle>
            <CardDescription className="text-sm">
              Set your topic, preferences, and length to generate a complete academic paper.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Topic */}
        <div className="space-y-2">
          <Label htmlFor="topic" className="text-sm font-medium">
            Research Topic <span className="text-destructive">*</span>
          </Label>
          <Input
            id="topic"
            placeholder="e.g. Impact of Artificial Intelligence on Healthcare Diagnosis"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="h-11"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <p className="text-xs text-muted-foreground">
            Be specific for higher quality results (min. 5 characters)
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Additional Details <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Specific aspects, methodologies, focus areas, or constraints you want covered..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Domain & Citation */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              Subject Domain
            </Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Computer Science">Computer Science</SelectItem>
                <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                <SelectItem value="Biology">Biology</SelectItem>
                <SelectItem value="Medicine">Medicine</SelectItem>
                <SelectItem value="Physics">Physics</SelectItem>
                <SelectItem value="Chemistry">Chemistry</SelectItem>
                <SelectItem value="Economics">Economics</SelectItem>
                <SelectItem value="Psychology">Psychology</SelectItem>
                <SelectItem value="Environmental Science">Environmental Science</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Social Sciences">Social Sciences</SelectItem>
                <SelectItem value="Political Science">Political Science</SelectItem>
                <SelectItem value="Business & Management">Business & Management</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Law">Law</SelectItem>
                <SelectItem value="Philosophy">Philosophy</SelectItem>
                <SelectItem value="Data Science">Data Science</SelectItem>
                <SelectItem value="Biotechnology">Biotechnology</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Citation Style
            </Label>
            <Select value={citationStyle} onValueChange={setCitationStyle}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IEEE">IEEE</SelectItem>
                <SelectItem value="APA">APA 7th Edition</SelectItem>
                <SelectItem value="MLA">MLA 9th Edition</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Page Count Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Paper Length</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-semibold text-xs">
                {pageCount} pages
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                ~{wordCount.toLocaleString()} words
              </Badge>
            </div>
          </div>
          <Slider
            min={3}
            max={25}
            step={1}
            value={[pageCount]}
            onValueChange={([val]) => setPageCount(val)}
            className="py-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium tracking-wide">
            <span>3 pages</span>
            <span>10 pages</span>
            <span>15 pages</span>
            <span>20 pages</span>
            <span>25 pages</span>
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !topic.trim() || topic.trim().length < 5}
          className="w-full h-11 gap-2 text-sm font-semibold shadow-sm"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Paper...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Journal Paper
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
