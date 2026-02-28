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
import { Sparkles, Loader2, FileText, BookOpen, GraduationCap, User, Building2, Hash, Plus, X, Lightbulb } from 'lucide-react'

interface GenerateFormProps {
  onGenerate: (options: {
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
  }) => void
  isLoading: boolean
}

export function GenerateForm({ onGenerate, isLoading }: GenerateFormProps) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [domain, setDomain] = useState('Computer Science')
  const [citationStyle, setCitationStyle] = useState('IEEE')
  const [pageCount, setPageCount] = useState(10)

  // Authors (at least 1, up to 4)
  const [authors, setAuthors] = useState<{ name: string; registerNumber: string }[]>([
    { name: '', registerNumber: '' },
  ])
  const [affiliation, setAffiliation] = useState('')
  const [department, setDepartment] = useState('')
  const [college, setCollege] = useState('')

  // Proposed system idea
  const [proposedIdea, setProposedIdea] = useState('')

  const wordCount = pageCount * 850

  const addAuthor = () => {
    if (authors.length < 4) {
      setAuthors([...authors, { name: '', registerNumber: '' }])
    }
  }

  const removeAuthor = (idx: number) => {
    if (authors.length > 1) {
      setAuthors(authors.filter((_, i) => i !== idx))
    }
  }

  const updateAuthor = (idx: number, field: 'name' | 'registerNumber', value: string) => {
    const updated = [...authors]
    updated[idx] = { ...updated[idx], [field]: value }
    setAuthors(updated)
  }

  const handleSubmit = () => {
    if (!topic.trim() || topic.trim().length < 5) return
    if (!authors[0].name.trim()) return
    onGenerate({
      topic: topic.trim(),
      domain,
      citationStyle,
      wordCount,
      pageCount,
      authors: authors.filter(a => a.name.trim()),
      affiliation: affiliation.trim(),
      department: department.trim(),
      college: college.trim(),
      proposedIdea: description.trim()
        ? `${description.trim()}${proposedIdea.trim() ? '\n\n' + proposedIdea.trim() : ''}`
        : proposedIdea.trim(),
    })
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
              Set your topic, author details, and preferences to generate a complete IEEE-format academic paper.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Authors */}
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <User className="h-4 w-4 text-primary" />
              Authors
            </Label>
            {authors.length < 4 && (
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addAuthor}>
                <Plus className="h-3 w-3" /> Add Author
              </Button>
            )}
          </div>
          {authors.map((author, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`author-${idx}`} className="text-xs text-muted-foreground">
                  Author {idx + 1} {idx === 0 && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={`author-${idx}`}
                  placeholder="Full Name"
                  value={author.name}
                  onChange={(e) => updateAuthor(idx, 'name', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`reg-${idx}`} className="text-xs text-muted-foreground">
                  Register No.
                </Label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id={`reg-${idx}`}
                    placeholder="e.g. 2021CS1234"
                    value={author.registerNumber}
                    onChange={(e) => updateAuthor(idx, 'registerNumber', e.target.value)}
                    className="h-9 pl-8"
                  />
                </div>
              </div>
              {authors.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeAuthor(idx)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Affiliation */}
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" />
            Affiliation
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-xs text-muted-foreground">Department</Label>
              <Input
                id="department"
                placeholder="e.g. Computer Science and Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="college" className="text-xs text-muted-foreground">College / University</Label>
              <Input
                id="college"
                placeholder="e.g. MIT"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="affiliation" className="text-xs text-muted-foreground">City, Country</Label>
              <Input
                id="affiliation"
                placeholder="e.g. Cambridge, MA, USA"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>

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

        {/* Proposed System Idea */}
        <div className="space-y-2">
          <Label htmlFor="proposedIdea" className="text-sm font-medium flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            Proposed System / Methodology
            <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Textarea
            id="proposedIdea"
            placeholder="Describe your proposed approach, system architecture, algorithm, or novel method... Leave blank and the AI will design one for you."
            value={proposedIdea}
            onChange={(e) => setProposedIdea(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            If you have a specific idea for the proposed system, describe it here. Otherwise, the AI will create one.
          </p>
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
            max={30}
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
            <span>30 pages</span>
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !topic.trim() || topic.trim().length < 5 || !authors[0].name.trim()}
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
