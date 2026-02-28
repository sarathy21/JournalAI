import { auth } from '@clerk/nextjs/server'
import { getPaperById, updatePaper, deletePaper } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const paper = await getPaperById(id, userId)
    return Response.json(paper)
  } catch (error) {
    console.error('Get paper error:', error)
    return Response.json({ error: 'Paper not found' }, { status: 404 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { content } = await request.json()
    if (!content) {
      return Response.json({ error: 'Content is required' }, { status: 400 })
    }

    await updatePaper(id, userId, content)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Update paper error:', error)
    return Response.json({ error: 'Failed to update paper' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    await deletePaper(id, userId)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete paper error:', error)
    return Response.json({ error: 'Failed to delete paper' }, { status: 500 })
  }
}
