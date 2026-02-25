import Groq from 'groq-sdk'
import { auth } from '@clerk/nextjs/server'
import { buildSectionPrompts } from '@/lib/prompts'

// Models in priority order — each has its own separate daily quota on Groq free tier:
//   llama-3.3-70b-versatile : 100k TPD  (best quality, newest)
//   llama3-70b-8192          : 500k TPD  (same 70B architecture, older release)
//   llama-3.1-8b-instant     : 500k TPD  (fast 8B, lower quality but works)
const MODEL_FALLBACKS = [
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  'llama-3.1-8b-instant',
]

/** Attempt one streaming Groq call; on 429 or 503, throw a retryable error. */
async function createStreamWithFallback(
  client: Groq,
  sectionSystemMessage: string,
  sectionUserPrompt: string,
): Promise<AsyncIterable<Groq.Chat.Completions.ChatCompletionChunk>> {
  let lastErr: unknown
  for (const model of MODEL_FALLBACKS) {
    try {
      const stream = await client.chat.completions.create({
        model,
        max_tokens: 8192,
        stream: true,
        temperature: 0.4,
        top_p: 0.9,
        messages: [
          { role: 'system', content: sectionSystemMessage },
          { role: 'user',   content: sectionUserPrompt },
        ],
      })
      return stream
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      const code   = (err as { error?: { code?: string } })?.error?.code
      const isRateLimit = status === 429 || code === 'rate_limit_exceeded'
      const isOverload  = status === 503
      if (isRateLimit || isOverload) {
        console.warn(`Model ${model} rate-limited (${status}), trying next fallback…`)
        lastErr = err
        continue
      }
      throw err // non-retryable error — bubble up immediately
    }
  }
  throw lastErr // all models exhausted
}

export async function POST(request: Request) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const { userId } = await auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json()
  const { topic, domain, citationStyle, wordCount, pageCount, authorName, department, college, registerNumber } = body

  if (!topic || topic.trim().length < 5) {
    return new Response('Topic is required and must be at least 5 characters', { status: 400 })
  }

  const sections = buildSectionPrompts({
    topic,
    domain: domain || 'Computer Science',
    citationStyle: citationStyle || 'IEEE',
    wordCount: wordCount || 2000,
    pageCount: pageCount || undefined,
    authorName: authorName || undefined,
    department: department || undefined,
    college: college || undefined,
    registerNumber: registerNumber || undefined,
  })

  // Stream all sections sequentially in one ReadableStream
  const readable = new ReadableStream({
    async start(controller) {
      const encode = (t: string) => controller.enqueue(new TextEncoder().encode(t))
      try {
        for (const section of sections) {
          const stream = await createStreamWithFallback(
            client,
            section.systemMessage,
            section.userPrompt,
          )
          for await (const chunk of stream) {
            const text = (chunk as Groq.Chat.Completions.ChatCompletionChunk).choices[0]?.delta?.content ?? ''
            if (text) encode(text)
          }
          // Small separator between sections for clean concatenation
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

