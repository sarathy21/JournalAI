import Groq from 'groq-sdk'
import { auth } from '@clerk/nextjs/server'
import { buildSectionPrompts } from '@/lib/prompts'

export async function POST(request: Request) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const { userId } = await auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json()
  const { topic, domain, citationStyle, wordCount, pageCount } = body

  if (!topic || topic.trim().length < 5) {
    return new Response('Topic is required and must be at least 5 characters', { status: 400 })
  }

  const sections = buildSectionPrompts({
    topic,
    domain: domain || 'Computer Science',
    citationStyle: citationStyle || 'IEEE',
    wordCount: wordCount || 2000,
    pageCount: pageCount || undefined,
  })

  // Stream all sections sequentially in one ReadableStream
  const readable = new ReadableStream({
    async start(controller) {
      const encode = (t: string) => controller.enqueue(new TextEncoder().encode(t))
      try {
        for (const section of sections) {
          const stream = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 8192,
            stream: true,
            temperature: 0.7,
            messages: [
              { role: 'system', content: section.systemMessage },
              { role: 'user',   content: section.userPrompt },
            ],
          })
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) encode(text)
          }
          // Small separator between sections (newline) for clean concatenation
          encode('\n')
        }
      } catch (err) {
        console.error('Generation error:', err)
        encode(`<p style="color:red">Error during generation: ${err instanceof Error ? err.message : String(err)}</p>`)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
