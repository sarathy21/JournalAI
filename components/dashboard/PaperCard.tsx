'use client'

import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, ArrowRight } from 'lucide-react'

interface PaperCardProps {
  paper: {
    id: string
    title: string
    topic: string
    domain: string
    citation_style: string
    created_at: string
  }
  onDelete?: (id: string) => void
}

export function PaperCard({ paper, onDelete }: PaperCardProps) {
  const formattedDate = new Date(paper.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Card className="group flex flex-col hover:shadow-md transition-all duration-200 border-border/60 hover:border-border">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">{paper.title}</h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 flex-1">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{paper.topic}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{paper.domain}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{paper.citation_style}</Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t gap-2 justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formattedDate}
        </div>
        <Button asChild size="xs" variant="ghost" className="gap-1 text-xs">
          <Link href={`/paper/${paper.id}`}>
            Open
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
