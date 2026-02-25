import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sparkles,
  PenLine,
  FileDown,
  BookOpen,
  Search,
  Shield,
  ArrowRight,
  FileText,
  ChevronRight,
} from 'lucide-react'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_40%,hsl(var(--primary)/0.08),transparent)]" />
        <div className="mx-auto max-w-5xl px-4 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Academic Papers,{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Generated in Seconds
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Enter a topic, choose your citation style, and receive a complete, structured
            academic journal paper — ready to edit and export as PDF or DOCX.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild className="text-base px-8 gap-2 h-12 shadow-md">
              <Link href="/sign-up">
                <Sparkles className="h-4 w-4" />
                Generate Your First Paper
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base h-12 gap-1.5">
              <Link href="/sign-in">
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 flex items-center justify-center gap-8 sm:gap-16 text-center">
            {[
              { value: '3–25', label: 'A4 Pages' },
              { value: '3', label: 'Citation Styles' },
              { value: '20+', label: 'Domains' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Three steps to a publication-ready paper</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', icon: PenLine, title: 'Enter Topic', desc: 'Provide your research topic, domain, citation style, and desired page count.' },
              { step: '2', icon: Sparkles, title: 'AI Generates', desc: 'Our AI writes a complete paper with abstract, methodology, results, and references.' },
              { step: '3', icon: FileDown, title: 'Edit & Export', desc: 'Edit in the rich text editor, then export as PDF or DOCX — ready to submit.' },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-8 text-xs font-bold text-primary/60">
                  Step {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Everything You Need</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A complete toolkit for generating, editing, analyzing, and exporting academic papers.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Sparkles,
                title: 'AI-Powered Generation',
                description: 'Complete papers with Abstract, Introduction, Literature Review, Methodology, Results, Discussion, and References.',
              },
              {
                icon: PenLine,
                title: 'Rich Text Editor',
                description: 'Full-featured editor with formatting, alignment, colors, highlighting, undo/redo, and more.',
              },
              {
                icon: FileDown,
                title: 'Export PDF & DOCX',
                description: 'Download as a formatted Word document or print-ready PDF with proper A4 page sizing.',
              },
              {
                icon: BookOpen,
                title: 'IEEE, APA & MLA',
                description: 'Choose from three major citation styles. All references are formatted correctly.',
              },
              {
                icon: Search,
                title: 'AI Content Analyzer',
                description: 'Get AI-powered scores for readability, academic tone, structure, grammar, and improvement suggestions.',
              },
              {
                icon: Shield,
                title: 'Secure & Cloud-Saved',
                description: 'Your papers are private, saved to cloud with Supabase, and accessible from anywhere.',
              },
            ].map((feature) => (
              <Card key={feature.title} className="group border bg-card hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20 text-center">
          <FileText className="h-10 w-10 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to write smarter?</h2>
          <p className="text-primary-foreground/70 mb-8 text-lg">
            Join researchers and students using JournalAI to produce high-quality academic papers.
          </p>
          <Button size="lg" variant="secondary" asChild className="gap-2 h-12 px-8 text-base">
            <Link href="/sign-up">
              Start for Free
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Created by sarathy s</p>
      </footer>
    </div>
  )
}
