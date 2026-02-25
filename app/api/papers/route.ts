import { auth } from '@clerk/nextjs/server'
import { savePaper } from '@/lib/supabase'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, topic, domain, citation_style, word_count_target, page_count, content, format_template } = body

    if (!title || !topic || !content) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const paper = await savePaper({
      user_id: userId,
      title,
      topic,
      domain: domain || 'Computer Science',
      citation_style: citation_style || 'IEEE',
      word_count_target: word_count_target || 2000,
      page_count: page_count || 10,
      content,
      format_template: format_template || 'ieee-two-column',
    })

    return Response.json(paper, { status: 201 })
  } catch (error) {
    console.error('Save paper error:', error)
    const message = error instanceof Error ? error.message : 'Failed to save paper'
    return Response.json({ error: message }, { status: 500 })
  }
}
