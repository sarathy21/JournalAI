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
  const { topic, domain, citationStyle, wordCount, pageCount, authors, affiliation, department, college, proposedIdea,
    // Legacy single-author fields
    authorName, registerNumber } = body

  if (!topic || topic.trim().length < 5) {
    return new Response('Topic is required and must be at least 5 characters', { status: 400 })
  }

  const sections = buildSectionPrompts({
    topic,
    domain: domain || 'Computer Science',
    citationStyle: citationStyle || 'IEEE',
    wordCount: wordCount || 2000,
    pageCount: pageCount || undefined,
    authors: authors || undefined,
    affiliation: affiliation || undefined,
    department: department || undefined,
    college: college || undefined,
    proposedIdea: proposedIdea || undefined,
    // Legacy compat
    authorName: authorName || undefined,
    registerNumber: registerNumber || undefined,
  })

  /** Rough word count from an HTML string (strips tags first) */
  function countWords(html: string): number {
    return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  }

  /** Stream a single NVIDIA call into the controller, returning all emitted HTML */
  async function streamSection(
    sysMsg: string,
    userMsg: string,
    encode: (t: string) => void,
    assistantContext?: string,
  ): Promise<string> {
    const LINE_START_HTML = /(^|\n)\s*<(h[1-6]|div|p|table|ul|ol|pre|section|article)\b/i
    let accumulated = ''
    let htmlStarted = false
    let emitted = ''

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: sysMsg },
      { role: 'user',   content: userMsg },
    ]
    if (assistantContext) {
      messages.push({ role: 'assistant', content: assistantContext })
      messages.push({
        role: 'user',
        content:
          'Continue writing now. Do NOT output any new <h2> section headings. ' +
          'Do NOT repeat content already written. ' +
          'Begin immediately with the next <p> paragraph and keep writing until you reach the required word count.',
      })
    }

    const stream = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      messages,
      temperature: 0.6,
      top_p: 0.95,
      max_tokens: 65536,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true,
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (!text) continue

      if (htmlStarted) {
        encode(text)
        emitted += text
      } else {
        accumulated += text
        const stripped = stripThinkBlocks(accumulated)
        const match = LINE_START_HTML.exec(stripped)
        if (match !== null) {
          htmlStarted = true
          const tagStart = stripped.indexOf('<', match.index)
          const html = stripped.slice(tagStart)
          encode(html)
          emitted += html
          accumulated = ''
        }
      }
    }

    // Safety fallback
    if (!htmlStarted && accumulated) {
      const stripped = stripThinkBlocks(accumulated)
      const match = LINE_START_HTML.exec(stripped)
      if (match !== null) {
        const tagStart = stripped.indexOf('<', match.index)
        const html = stripped.slice(tagStart)
        encode(html)
        emitted += html
      }
    }

    return emitted
  }

  // Stream all sections sequentially in one ReadableStream
  const readable = new ReadableStream({
    async start(controller) {
      const encode = (t: string) => controller.enqueue(new TextEncoder().encode(t))
      try {
        for (const section of sections) {
          // First pass
          let sectionHTML = await streamSection(
            section.systemMessage,
            section.userPrompt,
            encode,
          )

          // Continuation pass: if output is below 80% of the target, ask the model to keep going
          const words = countWords(sectionHTML)
          const target = section.minWords
          if (words < target * 0.80) {
            const continuationSys =
              section.systemMessage +
              `\n\nCRITICAL: You only wrote approximately ${words} words but this section requires ${target} words minimum. ` +
              `You need at least ${target - words} more words. Continue writing now.`
            const extra = await streamSection(
              continuationSys,
              section.userPrompt,
              encode,
              sectionHTML,
            )
            sectionHTML += extra
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

