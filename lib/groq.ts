import Groq from 'groq-sdk'
import { buildJournalPrompt, PaperOptions } from './prompts'

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function generatePaperStream(options: PaperOptions) {
  const prompt = buildJournalPrompt(options)

  const stream = await client.chat.completions.create({
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

export { client }
