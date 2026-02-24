import { auth } from '@clerk/nextjs/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx'

function htmlToDocxParagraphs(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // Strip tags and split by block-level elements
  const cleaned = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n__H1__$1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n__H2__$1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n__H3__$1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n• $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

  const lines = cleaned.split('\n').filter((l) => l.trim())

  for (const line of lines) {
    if (line.startsWith('__H1__')) {
      paragraphs.push(
        new Paragraph({
          text: line.replace('__H1__', ''),
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      )
    } else if (line.startsWith('__H2__')) {
      paragraphs.push(
        new Paragraph({
          text: line.replace('__H2__', ''),
          heading: HeadingLevel.HEADING_2,
        })
      )
    } else if (line.startsWith('__H3__')) {
      paragraphs.push(
        new Paragraph({
          text: line.replace('__H3__', ''),
          heading: HeadingLevel.HEADING_3,
        })
      )
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line.trim(), size: 24 })],
          spacing: { after: 200 },
        })
      )
    }
  }

  return paragraphs
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { content, title, format } = await request.json()

  if (!content) {
    return new Response('Content is required', { status: 400 })
  }

  if (format === 'docx') {
    const paragraphs = htmlToDocxParagraphs(content)
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in twips (1/1440 inch)
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
          },
        },
        children: paragraphs,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    // Convert to Uint8Array for Web API compatibility
    const uint8Array = new Uint8Array(buffer)

    return new Response(uint8Array, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title || 'paper'}.docx"`,
      },
    })
  }

  return new Response('Unsupported format', { status: 400 })
}
