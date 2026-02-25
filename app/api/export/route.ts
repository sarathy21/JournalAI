import { auth } from '@clerk/nextjs/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'

function htmlToDocxParagraphs(html: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  // Extract and process tables first — replace with placeholders
  let processedHtml = html
  const tables: string[] = []
  processedHtml = processedHtml.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match) => {
    tables.push(match)
    return `\n__TABLE_${tables.length - 1}__\n`
  })

  // Strip pre.figure blocks to text
  processedHtml = processedHtml
    .replace(/<pre[^>]*class="figure"[^>]*>([\s\S]*?)<\/pre>/gi, '\n__FIGURE_START__$1__FIGURE_END__\n')

  // Process block-level elements
  const cleaned = processedHtml
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n__H1__$1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n__H2__$1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n__H3__$1\n')
    .replace(/<div[^>]*class="author-block"[^>]*>([\s\S]*?)<\/div>/gi, '\n__AUTHOR_BLOCK__$1__AUTHOR_END__\n')
    .replace(/<p[^>]*class="table-caption"[^>]*>(.*?)<\/p>/gi, '\n__TABLE_CAPTION__$1\n')
    .replace(/<p[^>]*class="fig-caption"[^>]*>(.*?)<\/p>/gi, '\n__FIG_CAPTION__$1\n')
    .replace(/<p[^>]*class="author-name"[^>]*>(.*?)<\/p>/gi, '\n__AUTHOR_NAME__$1\n')
    .replace(/<p[^>]*class="author-detail"[^>]*>(.*?)<\/p>/gi, '\n__AUTHOR_DETAIL__$1\n')
    .replace(/<p[^>]*class="keywords"[^>]*>(.*?)<\/p>/gi, '\n__KEYWORDS__$1\n')
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
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace('__H1__', ''), bold: true, size: 32, font: 'Times New Roman' })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      )
    } else if (line.startsWith('__H2__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace('__H2__', ''), bold: true, size: 22, font: 'Times New Roman' })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
        })
      )
    } else if (line.startsWith('__H3__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace('__H3__', ''), bold: true, italics: true, size: 20, font: 'Times New Roman' })],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 60 },
        })
      )
    } else if (line.startsWith('__AUTHOR_NAME__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace('__AUTHOR_NAME__', ''), bold: true, size: 24, font: 'Times New Roman' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
        })
      )
    } else if (line.startsWith('__AUTHOR_DETAIL__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace('__AUTHOR_DETAIL__', ''), italics: true, size: 18, font: 'Times New Roman' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
        })
      )
    } else if (line.startsWith('__TABLE_CAPTION__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace('__TABLE_CAPTION__', ''), bold: true, size: 18, font: 'Times New Roman' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 60 },
        })
      )
    } else if (line.startsWith('__FIG_CAPTION__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace('__FIG_CAPTION__', ''), italics: true, size: 18, font: 'Times New Roman' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 160 },
        })
      )
    } else if (line.startsWith('__KEYWORDS__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line.replace('__KEYWORDS__', ''), size: 18, font: 'Times New Roman' })],
          spacing: { after: 200 },
        })
      )
    } else if (line.match(/__TABLE_(\d+)__/)) {
      const idx = parseInt(line.match(/__TABLE_(\d+)__/)![1])
      const tableHtml = tables[idx]
      if (tableHtml) {
        const docxTable = parseHtmlTable(tableHtml)
        if (docxTable) elements.push(docxTable)
      }
    } else if (line.includes('__FIGURE_START__')) {
      // ASCII figure — render as monospace text
      const figText = line.replace('__FIGURE_START__', '').replace('__FIGURE_END__', '').trim()
      const figLines = figText.split('\n').filter(Boolean)
      for (const fl of figLines) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: fl, font: 'Courier New', size: 16 })],
            alignment: AlignmentType.CENTER,
          })
        )
      }
    } else {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line.trim(), size: 20, font: 'Times New Roman' })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
        })
      )
    }
  }

  return elements
}

function parseHtmlTable(tableHtml: string): Table | null {
  try {
    const rows: TableRow[] = []
    const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []

    for (const rowHtml of rowMatches) {
      const cells: TableCell[] = []
      const cellMatches = rowHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || []
      const isHeader = rowHtml.includes('<th')

      for (const cellHtml of cellMatches) {
        const text = cellHtml.replace(/<[^>]+>/g, '').trim()
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                    bold: isHeader,
                    size: 18,
                    font: 'Times New Roman',
                  }),
                ],
                alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
              }),
            ],
            width: { size: Math.floor(100 / Math.max(cellMatches.length, 1)), type: WidthType.PERCENTAGE },
          })
        )
      }
      if (cells.length > 0) {
        rows.push(new TableRow({ children: cells }))
      }
    }

    if (rows.length === 0) return null

    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  } catch {
    return null
  }
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
