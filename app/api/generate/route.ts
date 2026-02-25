import OpenAI from 'openai'
import { auth } from '@clerk/nextjs/server'
import { buildSectionPrompts } from '@/lib/prompts'

// NVIDIA NIM API — OpenAI-compatible endpoint
// Model: nvidia/llama-3.3-nemotron-super-49b-v1.5
// High quality, long context (65k tokens), excellent for academic paper generation
const NVIDIA_MODEL = 'nvidia/llama-3.3-nemotron-super-49b-v1.5'

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
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
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

