import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserPapers, syncUserToSupabase } from '@/lib/supabase'
import { PaperCard } from '@/components/dashboard/PaperCard'
import { Button } from '@/components/ui/button'
import { Plus, FileText, AlertCircle } from 'lucide-react'
import type { Paper } from '@/types'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Ensure user exists in Supabase (covers first-time registration & dev mode)
  const user = await currentUser()
  if (user) {
    await syncUserToSupabase({
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    })
  }

  let papers: Paper[] = []
  let error: string | null = null

  try {
    papers = (await getUserPapers(userId)) as Paper[]
  } catch (e) {
    error = 'Could not load papers. Please check your Supabase configuration.'
    console.error(e)
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Papers</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {papers.length} paper{papers.length !== 1 ? 's' : ''} saved to your library
            </p>
          </div>
          <Button asChild className="gap-2 shadow-sm">
            <Link href="/generate">
              <Plus className="h-4 w-4" />
              New Paper
            </Link>
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Connection Error</p>
              <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Papers Grid */}
        {papers.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-5">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1.5">No papers yet</h2>
            <p className="text-muted-foreground mb-6 text-sm max-w-xs">
              Generate your first academic paper with AI and it will appear here.
            </p>
            <Button asChild className="gap-2">
              <Link href="/generate">
                <Plus className="h-4 w-4" />
                Generate Your First Paper
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
