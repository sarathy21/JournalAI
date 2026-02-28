import { auth } from '@clerk/nextjs/server'
import sharp from 'sharp'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  SectionType,
} from 'docx'

/**
 * Split HTML content into front-matter elements and body elements.
 * Front matter: h1, author-block, abstract, keywords (single-column)
 * Body: numbered sections I. onward (two-column)
 */
/** Convert SVG string to PNG buffer, scaled to maxWidth, returns null on failure */
async function svgToPng(
  svgString: string,
  maxWidth = 420
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  try {
    const input = Buffer.from(svgString, 'utf8')
    const result = await sharp(input)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true })
    return { buffer: result.data, width: result.info.width, height: result.info.height }
  } catch {
    return null
  }
}

function splitFrontMatterAndBody(html: string): { frontMatter: string; body: string } {
  // Keep SVGs intact — they will be converted to images in htmlToDocxParagraphs
  // Strip only the container div wrappers so the split regex stays simple
  let processed = html
  processed = processed.replace(/<div[^>]*class="(?:figure-container|chart-container)"[^>]*>[\s\S]*?<\/div>/gi, (match) => {
    // Keep inner content (SVG + captions), strip wrapper div tags only
    return match.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '')
  })

  // Strategy: Title + Authors + Abstract + Keywords go into single-column front-matter.
  // Everything from the first numbered section heading goes into two-column body.
  const bodyStartRegex = /<h2[^>]*>\s*(I\.|II\.|III\.|IV\.|V\.|VI\.|VII\.|VIII\.|IX\.|X\.|1\.|2\.)/i
  const bodyMatch = bodyStartRegex.exec(processed)

  if (bodyMatch && bodyMatch.index > 0) {
    return {
      frontMatter: processed.slice(0, bodyMatch.index).trim(),
      body: processed.slice(bodyMatch.index).trim(),
    }
  }

  // Fallback: first <h2> that is NOT Abstract
  const fallbackRegex = /<h2[^>]*>(?!\s*Abstract)/i
  const fallbackMatch = fallbackRegex.exec(processed)
  if (fallbackMatch && fallbackMatch.index > 0) {
    return {
      frontMatter: processed.slice(0, fallbackMatch.index).trim(),
      body: processed.slice(fallbackMatch.index).trim(),
    }
  }

  // No split possible — everything is body
  return { frontMatter: '', body: processed }
}

async function htmlToDocxParagraphs(html: string): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = []

  // Strip figure/chart container wrapper divs only (keep inner content incl. SVGs)
  let processedHtml = html.replace(/<div[^>]*class="(?:figure-container|chart-container)"[^>]*>/gi, '')

  // Extract SVGs — convert to PNG and replace with indexed placeholders
  const svgImages: Array<{ buffer: Buffer; width: number; height: number } | null> = []
  processedHtml = processedHtml.replace(/<svg[\s\S]*?<\/svg>/gi, (svgMatch) => {
    svgImages.push(null) // placeholder, filled after async conversion
    return `\n__SVG_${svgImages.length - 1}__\n`
  })
  // Now convert all SVGs to PNG in parallel
  const svgStrings: string[] = []
  html.replace(/<svg[\s\S]*?<\/svg>/gi, (m) => { svgStrings.push(m); return '' })
  const converted = await Promise.all(svgStrings.map(s => svgToPng(s)))
  converted.forEach((r, i) => { svgImages[i] = r })

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
    } else if (seg.match(/^__SVG_(\d+)__$/)) {
      const idx = parseInt(seg.match(/^__SVG_(\d+)__$/)![1])
      const img = svgImages[idx]
      if (img) {
        elements.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: img.buffer,
                transformation: { width: img.width, height: img.height },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
          })
        )
      } else {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: '[Figure]', italics: true, size: 20, font: 'Times New Roman' })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
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
      const frontMatterElements = await htmlToDocxParagraphs(frontMatter)
      const bodyElements = await htmlToDocxParagraphs(body)

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
      const paragraphs = await htmlToDocxParagraphs(content)
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
