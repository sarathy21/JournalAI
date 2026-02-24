import Groq from 'groq-sdk'
import { buildJournalPrompt, PaperOptions } from './prompts'

let client: Groq | null = null

function getClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY environment variable is not set. Please add it to your .env.local file.'
      )
    }
    client = new Groq({ apiKey })
  }
  return client
}

export async function generatePaperStream(options: PaperOptions) {
  const prompt = buildJournalPrompt(options)
  const groqClient = getClient()

  const stream = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 8192,
    stream: true,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  return stream
}

export { getClient }
