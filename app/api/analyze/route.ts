import Groq from 'groq-sdk'
import { auth } from '@clerk/nextjs/server'
import { buildAnalysisPrompt } from '@/lib/prompts'

export async function POST(request: Request) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const { userId } = await auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json()
  const { content } = body

  if (!content || content.trim().length < 50) {
    return new Response('Content is too short to analyze', { status: 400 })
  }

  try {
    const prompt = buildAnalysisPrompt(content)

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''

    // Parse JSON from the response — handle possible markdown wrapping
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Failed to parse analysis' }, { status: 500 })
    }

    const analysis = JSON.parse(jsonMatch[0])
    return Response.json(analysis)
  } catch (error) {
    console.error('Analysis error:', error)
    return new Response('Failed to analyze content', { status: 500 })
  }
}
