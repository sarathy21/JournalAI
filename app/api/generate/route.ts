import OpenAI from 'openai'
import { auth } from '@clerk/nextjs/server'
import { buildSectionPrompts } from '@/lib/prompts'

// NVIDIA NIM API — OpenAI-compatible endpoint
// Model: nvidia/llama-3.3-nemotron-super-49b-v1.5
// High quality, long context (65k tokens), excellent for academic paper generation
const NVIDIA_MODEL = 'nvidia/llama-3.3-nemotron-super-49b-v1.5'

/** Remove all <think>...</think> blocks from a string (Nemotron reasoning tokens) */
function stripThinkBlocks(text: string): string {
  // Remove complete think blocks
  let result = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  // Remove orphaned opening tag and everything after it (partial block at end of chunk)
  const openIdx = result.lastIndexOf('<think>')
  if (openIdx !== -1) result = result.slice(0, openIdx)
  return result
}

/** Stream a single section via NVIDIA NIM API */
async function createNvidiaStream(
  client: OpenAI,
  sectionSystemMessage: string,
  sectionUserPrompt: string,
) {
  return client.chat.completions.create({
    model: NVIDIA_MODEL,
    messages: [
      { role: 'system', content: sectionSystemMessage },
      { role: 'user',   content: sectionUserPrompt },
    ],
    temperature: 0.6,
    top_p: 0.95,
    max_tokens: 65536,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: true,
  })
}

export async function POST(request: Request) {
  const client = new OpenAI({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY,
  })
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
          const stream = await createNvidiaStream(
            client,
            section.systemMessage,
            section.userPrompt,
          )

          // The Nemotron model outputs thinking/reasoning text before the actual HTML.
          // Thinking text mentions HTML tags mid-sentence ("use <p> tags", "begin with <h1>")
          // which a simple tag-search would falsely match.
          //
          // KEY INSIGHT: Actual paper HTML always begins on its OWN LINE (after \n or at
          // the very start of the response). Thinking prose NEVER starts a line with a tag.
          // So we wait until an HTML tag appears at the beginning of a line.
          //
          // Pattern: tag must be preceded by \n (or be at position 0 of stripped content)
          const LINE_START_HTML = /(^|\n)\s*<(h[1-6]|div|p|table|ul|ol|pre|section|article)\b/i

          let accumulated = ''
          let htmlStarted = false

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (!text) continue

            if (htmlStarted) {
              // Already streaming HTML — pass through (think blocks already stripped at entry)
              encode(text)
            } else {
              accumulated += text
              // Strip <think>...</think> blocks from accumulated buffer first
              const stripped = stripThinkBlocks(accumulated)
              // Only trigger when a tag is at the START OF A LINE
              const match = LINE_START_HTML.exec(stripped)
              if (match !== null) {
                htmlStarted = true
                // Find the index of the '<' in the match (skip the \n prefix)
                const tagStart = stripped.indexOf('<', match.index)
                encode(stripped.slice(tagStart))
                accumulated = ''
              }
              // Keep accumulating until we get a line-starting HTML tag
            }
          }

          // Safety fallback: if nothing was emitted, try line-start match on remainder
          if (!htmlStarted && accumulated) {
            const stripped = stripThinkBlocks(accumulated)
            const match = LINE_START_HTML.exec(stripped)
            if (match !== null) {
              const tagStart = stripped.indexOf('<', match.index)
              encode(stripped.slice(tagStart))
            }
          }

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

