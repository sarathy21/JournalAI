import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <span className="font-bold text-lg">JournalAI</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" asChild size="sm">
              <Link href="/generate">New Paper</Link>
            </Button>
            <Button asChild size="sm" className="hidden md:inline-flex ml-2">
              <Link href="/generate">✨ Generate</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
