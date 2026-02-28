import { auth } from '@clerk/nextjs/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  SectionType,
} from 'docx'

/**
 * Split HTML content into front-matter elements and body elements.
 * Front matter: h1, author-block (title + authors only)
 * Body: abstract, keywords, and all numbered sections (in two-column)
 */
function splitFrontMatterAndBody(html: string): { frontMatter: string; body: string } {
  // Remove SVG figures (cannot render in DOCX) but keep fig-captions
  let processed = html.replace(/<svg[\s\S]*?<\/svg>/gi, '[Figure]')
  // Remove figure-container/chart-container wrapper divs (opening + closing)
  processed = processed.replace(/<div[^>]*class="(?:figure-container|chart-container)"[^>]*>[\s\S]*?<\/div>/gi, (match) => {
    // Keep inner content (fig-captions etc) but strip the wrapper div
    return match.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '')
  })

  // Strategy: Only title + author-block go into single-column front-matter.
  // Abstract, keywords, and all sections go into two-column body.
  const authorBlockRegex = /<div[^>]*class="author-block"[^>]*>[\s\S]*?<\/div>/i
  const authorMatch = authorBlockRegex.exec(processed)

  if (authorMatch) {
    const splitIndex = authorMatch.index + authorMatch[0].length
    return {
      frontMatter: processed.slice(0, splitIndex).trim(),
      body: processed.slice(splitIndex).trim(),
    }
  }

  // Fallback: find first <h2> and split before it
  const firstH2 = /<h2[^>]*>/i.exec(processed)
  if (firstH2 && firstH2.index > 0) {
    return {
      frontMatter: processed.slice(0, firstH2.index).trim(),
      body: processed.slice(firstH2.index).trim(),
    }
  }

  // No split possible — everything is body
  return { frontMatter: '', body: processed }
}

function htmlToDocxParagraphs(html: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  // Remove SVG elements (not renderable in docx)
  let processedHtml = html.replace(/<svg[\s\S]*?<\/svg>/gi, '')
  // Strip figure/chart container wrapper divs only (keep inner content)
  processedHtml = processedHtml.replace(/<div[^>]*class="(?:figure-container|chart-container)"[^>]*>/gi, '')

  // Extract tables — replace with placeholders
  const tables: string[] = []
  processedHtml = processedHtml.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
    tables.push(match)
    return `\n__TABLE_${tables.length - 1}__\n`
  })

  // Extract pre.figure blocks — replace with placeholders (preserve newlines inside)
  const figures: string[] = []
  processedHtml = processedHtml.replace(/<pre[^>]*class="figure"[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner) => {
    figures.push(inner)
    return `\n__FIGURE_${figures.length - 1}__\n`
  })

  // Mark block-level elements with tokens — use [\s\S]*? to handle multi-line content
  const tokenised = processedHtml
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n__H1__$1__END__\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n__H2__$1__END__\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n__H3__$1__END__\n')
    .replace(/<div[^>]*class="author-block"[^>]*>([\s\S]*?)<\/div>/gi, '\n__AUTHOR_BLOCK__$1__END__\n')
    .replace(/<p[^>]*class="table-caption"[^>]*>([\s\S]*?)<\/p>/gi, '\n__TABLE_CAPTION__$1__END__\n')
    .replace(/<p[^>]*class="fig-caption"[^>]*>([\s\S]*?)<\/p>/gi, '\n__FIG_CAPTION__$1__END__\n')
    .replace(/<p[^>]*class="author-name"[^>]*>([\s\S]*?)<\/p>/gi, '\n__AUTHOR_NAME__$1__END__\n')
    .replace(/<p[^>]*class="author-reg"[^>]*>([\s\S]*?)<\/p>/gi, '\n__AUTHOR_REG__$1__END__\n')
    .replace(/<p[^>]*class="author-affiliation"[^>]*>([\s\S]*?)<\/p>/gi, '\n__AUTHOR_AFFILIATION__$1__END__\n')
    .replace(/<p[^>]*class="author-detail"[^>]*>([\s\S]*?)<\/p>/gi, '\n__AUTHOR_DETAIL__$1__END__\n')
    .replace(/<p[^>]*class="keywords"[^>]*>([\s\S]*?)<\/p>/gi, '\n__KEYWORDS__$1__END__\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n__P__$1__END__\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n__LI__$1__END__\n')
    .replace(/<br\s*\/?>/gi, '\n')

  // Split into segments on our token boundaries
  const segments = tokenised.split('\n').map(s => s.trim()).filter(Boolean)

  // Track whether the next paragraph is the first after a heading (no first-line indent)
  let firstAfterHeading = true

  const extractContent = (seg: string, token: string): string =>
    seg.slice(token.length, seg.endsWith('__END__') ? -7 : undefined)

  for (const seg of segments) {
    // Skip stray end markers from block extraction
    if (seg === '__END__') continue
    if (seg.startsWith('__H1__')) {
      const text = extractContent(seg, '__H1__')
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(text, 28),
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      )
      firstAfterHeading = true
    } else if (seg.startsWith('__H2__')) {
      const text = extractContent(seg, '__H2__')
      const isCentered = /abstract/i.test(text)
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: text.replace(/<[^>]+>/g, '').trim(), bold: true, size: 24, font: 'Times New Roman', allCaps: true })],
          alignment: isCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: 240, after: 80 },
        })
      )
      firstAfterHeading = true
    } else if (seg.startsWith('__H3__')) {
      const text = extractContent(seg, '__H3__')
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: text.replace(/<[^>]+>/g, '').trim(), bold: true, italics: true, size: 22, font: 'Times New Roman' })],
          alignment: AlignmentType.LEFT,
          spacing: { before: 160, after: 60 },
        })
      )
      firstAfterHeading = true
    } else if (seg.startsWith('__AUTHOR_BLOCK__')) {
      // Author block is handled by sub-tokens inside it — just continue
      // (inner p.author-* lines will be picked up on subsequent segments)
      continue
    } else if (seg.startsWith('__AUTHOR_NAME__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: extractContent(seg, '__AUTHOR_NAME__').replace(/<[^>]+>/g, '').trim(), bold: true, size: 20, font: 'Times New Roman' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
        })
      )
    } else if (seg.startsWith('__AUTHOR_REG__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: extractContent(seg, '__AUTHOR_REG__').replace(/<[^>]+>/g, '').trim(), size: 18, font: 'Times New Roman', color: '333333' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 10 },
        })
      )
    } else if (seg.startsWith('__AUTHOR_AFFILIATION__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: extractContent(seg, '__AUTHOR_AFFILIATION__').replace(/<[^>]+>/g, '').trim(), italics: true, size: 18, font: 'Times New Roman', color: '333333' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 10 },
        })
      )
    } else if (seg.startsWith('__AUTHOR_DETAIL__')) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: extractContent(seg, '__AUTHOR_DETAIL__').replace(/<[^>]+>/g, '').trim(), italics: true, size: 18, font: 'Times New Roman' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
        })
      )
    } else if (seg.startsWith('__TABLE_CAPTION__')) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(extractContent(seg, '__TABLE_CAPTION__'), 18),
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 60 },
        })
      )
    } else if (seg.startsWith('__FIG_CAPTION__')) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(extractContent(seg, '__FIG_CAPTION__'), 18),
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 160 },
        })
      )
    } else if (seg.startsWith('__KEYWORDS__')) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(extractContent(seg, '__KEYWORDS__'), 18),
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
        })
      )
      firstAfterHeading = false
    } else if (seg.match(/^__TABLE_(\d+)__$/)) {
      const idx = parseInt(seg.match(/^__TABLE_(\d+)__$/)![1])
      const docxTable = parseHtmlTable(tables[idx] || '')
      if (docxTable) elements.push(docxTable)
    } else if (seg.match(/^__FIGURE_(\d+)__$/)) {
      const idx = parseInt(seg.match(/^__FIGURE_(\d+)__$/)![1])
      const figText = (figures[idx] || '').replace(/<[^>]+>/g, '').trim()
      for (const fl of figText.split('\n').filter(Boolean)) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: fl, font: 'Courier New', size: 16 })],
            alignment: AlignmentType.CENTER,
          })
        )
      }
    } else if (seg.startsWith('__LI__')) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting('• ' + extractContent(seg, '__LI__'), 20),
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 60 },
          indent: { left: 360 },
        })
      )
    } else if (seg.startsWith('__P__')) {
      const content = extractContent(seg, '__P__')
      const noIndent = firstAfterHeading
      firstAfterHeading = false
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(content, 20),
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
          indent: noIndent ? undefined : { firstLine: 360 },
        })
      )
    } else {
      // Plain text fallback (shouldn't happen much)
      const clean = seg.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
      if (!clean) continue
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: clean, size: 20, font: 'Times New Roman' })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
        })
      )
    }
  }

  return elements
}

/** Parse inline HTML formatting (<strong>, <em>, <b>, <i>) into TextRun array */
function parseInlineFormatting(text: string, baseSize = 20): TextRun[] {
  const runs: TextRun[] = []
  // Split on open/close bold/italic tags
  const parts = text.split(/(<strong[^>]*>|<\/strong>|<b[^>]*>|<\/b>|<em[^>]*>|<\/em>|<i[^>]*>|<\/i>)/gi)
  let bold = false, italic = false

  for (const part of parts) {
    if (!part) continue
    if (/^<(strong|b)([^>]*)?>$/i.test(part)) { bold = true; continue }
    if (/^<\/(strong|b)>$/i.test(part)) { bold = false; continue }
    if (/^<(em|i)([^>]*)?>$/i.test(part)) { italic = true; continue }
    if (/^<\/(em|i)>$/i.test(part)) { italic = false; continue }

    const clean = part
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    if (!clean) continue
    runs.push(new TextRun({ text: clean, bold, italics: italic, size: baseSize, font: 'Times New Roman' }))
  }

  if (runs.length === 0) return [new TextRun({ text: ' ', size: baseSize, font: 'Times New Roman' })]
  return runs
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

  const { content, title, format, formatId } = await request.json()

  if (!content) {
    return new Response('Content is required', { status: 400 })
  }

  if (format === 'docx') {
    const isTwoColumn = formatId === 'ieee-two-column'

    let doc: Document

    if (isTwoColumn) {
      // Split into front matter (single-column) and body (two-column)
      const { frontMatter, body } = splitFrontMatterAndBody(content)
      const frontMatterElements = htmlToDocxParagraphs(frontMatter)
      const bodyElements = htmlToDocxParagraphs(body)

      const pageProps = {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // ~0.79 inch (1cm)
        },
      }

      doc = new Document({
        sections: [
          // Section 1: Front matter — single column
          {
            properties: {
              ...pageProps,
              type: SectionType.CONTINUOUS,
            },
            children: frontMatterElements,
          },
          // Section 2: Body — two columns
          {
            properties: {
              ...pageProps,
              type: SectionType.CONTINUOUS,
              column: {
                space: 708, // ~0.5 inch gap between columns
                count: 2,
                separate: true,
              },
            },
            children: bodyElements,
          },
        ],
      })
    } else {
      // Single-column layout for all other formats
      const paragraphs = htmlToDocxParagraphs(content)
      doc = new Document({
        sections: [{
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: paragraphs,
        }],
      })
    }

    const buffer = await Packer.toBuffer(doc)
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
