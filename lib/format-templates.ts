/**
 * Academic paper format templates
 * CSS styles for PDF export in different academic formats
 */

export interface FormatTemplate {
  id: string
  name: string
  description: string
  preview: string // Short preview description
  css: string
}

// IEEE Two-Column Format (Conference/Journal standard)
const ieeetwocolumncss = `
  @page { 
    size: A4; 
    margin: 1cm;
    @top-center { content: counter(page); font-size: 10pt; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 10pt;
    line-height: 1.35;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  .page-frame {
    border: 2pt solid #000;
    padding: 0.8cm;
    min-height: calc(100vh - 2cm);
    background: #fff;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  .front-matter { 
    margin-bottom: 0.5em;
    column-span: all;
  }
  .front-matter h1 {
    text-align: center;
  }
  .front-matter h2 {
    text-align: center;
    font-size: 12pt;
    text-transform: uppercase;
    margin: 0.8em 0 0.3em 0;
  }
  .front-matter p {
    text-align: justify;
    text-indent: 0;
    margin: 0 0 0.4em 0;
  }
  /* Author block inside front-matter must stay centred */
  .front-matter .author-block { text-align: center; }
  .front-matter .author-name,
  .front-matter .author-reg,
  .front-matter .author-affiliation,
  .front-matter .author-detail { text-align: center !important; }
  .front-matter .keywords {
    text-align: left;
    font-size: 9pt;
    margin: 0.3em 0 0.8em 0;
    text-indent: 0;
    border-bottom: 1px solid #ccc;
    padding-bottom: 0.5em;
  }
  h1 { 
    font-size: 14pt; 
    text-align: center; 
    margin: 0 0 0.4em 0; 
    font-weight: bold; 
    text-transform: uppercase;
    column-span: all;
  }
  .author-block { 
    text-align: center; 
    margin: 0.3em 0 0.8em 0;
    column-span: all;
  }
  .author-name { font-size: 10pt; font-weight: bold; margin: 0.15em 0 0; text-align: center; }
  .author-reg { font-size: 9pt; margin: 0.05em 0; color: #333; text-align: center; }
  .author-affiliation { font-size: 9pt; font-style: italic; margin: 0.05em 0; color: #333; text-align: center; }
  .author-detail { font-size: 9pt; font-style: italic; margin: 0.1em 0; color: #333; text-align: center; }
  
  /* Two-column content area */
  .two-column {
    column-count: 2;
    column-gap: 0.6cm;
    column-rule: 1px solid #ccc;
  }
  
  h2 { 
    font-size: 12pt; 
    margin: 1em 0 0.4em 0; 
    font-weight: bold; 
    text-transform: uppercase;
    column-span: none;
  }
  h3 { 
    font-size: 11pt; 
    margin: 0.8em 0 0.3em 0; 
    font-weight: bold; 
    font-style: italic; 
  }
  p { 
    text-align: justify; 
    margin: 0 0 0.5em 0; 
    text-indent: 1em;
    orphans: 3;
    widows: 3;
  }
  p:first-of-type { text-indent: 0; }
  .keywords { font-size: 9pt; margin: 0.5em 0 1em 0; text-indent: 0; }
  
  /* Tables — stay inside column */
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 0.6em 0; 
    font-size: 8pt;
    break-inside: avoid;
  }
  table th, table td { 
    border: 1px solid #000; 
    padding: 3px 5px; 
    text-align: left; 
    vertical-align: top; 
  }
  table th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .table-caption { 
    text-align: center; 
    font-weight: bold; 
    font-size: 9pt; 
    margin: 0.8em 0 0.2em 0; 
    font-variant: small-caps; 
    text-indent: 0;
  }
  
  /* Figures — stay inside column */
  pre.figure { 
    background: #fafafa; 
    border: 1px solid #999; 
    padding: 0.6em; 
    margin: 0.6em auto; 
    font-family: 'Courier New', monospace; 
    font-size: 7pt; 
    line-height: 1.2; 
    text-align: center; 
    white-space: pre; 
    overflow: visible;
    break-inside: avoid;
    width: 100%;
  }
  .fig-caption { 
    text-align: center; 
    font-style: italic; 
    font-size: 8pt; 
    margin: 0.2em 0 0.6em 0; 
    text-indent: 0;
  }
  
  ul, ol { margin: 0.4em 0 0.4em 1.5em; font-size: 9pt; }
  li { margin-bottom: 0.2em; }
  strong { font-weight: bold; }
  em { font-style: italic; }
  
  /* SVG Charts & Figures — stay inside column, do NOT span */
  .figure-container { 
    text-align: center; 
    margin: 0.8em auto; 
    break-inside: avoid; 
    width: 100%;
  }
  .figure-container svg { 
    max-width: 100%; 
    height: auto; 
    display: block; 
    margin: 0 auto;
  }
  .figure-container .fig-caption {
    text-align: center;
    font-style: italic;
    font-size: 8pt;
    margin: 0.2em 0 0.4em 0;
    text-indent: 0;
  }
  .chart-container { 
    text-align: center; 
    margin: 0.8em auto; 
    break-inside: avoid;
    width: 100%;
  }
  .chart-container svg { 
    max-width: 100%; 
    height: auto; 
    display: block;
    margin: 0 auto;
  }
`

// IEEE Single Column Format
const ieeeSingleColumnCss = `
  @page { 
    size: A4; 
    margin: 1cm;
    @top-center { content: counter(page); font-size: 10pt; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  .page-frame {
    border: 2pt solid #000;
    padding: 1cm;
    min-height: calc(100vh - 2cm);
    background: #fff;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  h1 { 
    font-size: 14pt; 
    text-align: center; 
    margin: 0 0 0.5em 0; 
    font-weight: bold; 
    text-transform: uppercase;
  }
  .author-block { text-align: center; margin: 0.3em 0 1em 0; }
  .author-name { font-size: 10pt; font-weight: bold; margin: 0.15em 0 0; text-align: center; }
  .author-reg { font-size: 9pt; margin: 0.05em 0; color: #333; text-align: center; }
  .author-affiliation { font-size: 9pt; font-style: italic; margin: 0.05em 0; color: #333; text-align: center; }
  .author-detail { font-size: 9pt; font-style: italic; margin: 0.1em 0; color: #333; text-align: center; }
  .keywords { font-size: 10pt; margin: 0.5em 0 1.5em 0; }
  
  h2 { font-size: 12pt; margin: 1.2em 0 0.5em 0; font-weight: bold; text-transform: uppercase; }
  h3 { font-size: 11pt; margin: 1em 0 0.4em 0; font-weight: bold; font-style: italic; }
  p { text-align: justify; margin: 0 0 0.8em 0; text-indent: 1.5em; }
  p:first-of-type { text-indent: 0; }
  
  table { width: 100%; border-collapse: collapse; margin: 0.8em 0; font-size: 10pt; }
  table th, table td { border: 1px solid #000; padding: 6px 8px; text-align: left; vertical-align: top; }
  table th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .table-caption { text-align: center; font-weight: bold; font-size: 10pt; margin: 1em 0 0.3em 0; font-variant: small-caps; }
  
  pre.figure { background: #fafafa; border: 1px solid #999; padding: 1em; margin: 1em auto; max-width: 85%; font-family: 'Courier New', monospace; font-size: 9pt; line-height: 1.3; text-align: center; white-space: pre; }
  .fig-caption { text-align: center; font-style: italic; font-size: 10pt; margin: 0.3em 0 1em 0; }
  
  ul, ol { margin: 0.5em 0 0.5em 2em; }
  li { margin-bottom: 0.3em; }
  strong { font-weight: bold; }
  em { font-style: italic; }
  
  /* SVG Charts & Figures */
  .figure-container { text-align: center; margin: 1em auto; break-inside: avoid; }
  .figure-container svg { max-width: 100%; height: auto; display: inline-block; }
  .chart-container { text-align: center; margin: 1em auto; break-inside: avoid; }
  .chart-container svg { max-width: 100%; height: auto; }
`

// APA 7th Edition Format
const apaFormatCss = `
  @page { 
    size: A4; 
    margin: 1cm;
    @top-right { content: counter(page); font-size: 12pt; font-family: 'Times New Roman'; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 2; /* Double-spaced */
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  .page-frame {
    border: 1.5pt solid #000;
    padding: 1.2cm;
    min-height: calc(100vh - 2cm);
    background: #fff;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  .running-head {
    font-size: 12pt;
    text-transform: uppercase;
    margin-bottom: 1em;
    font-family: 'Times New Roman', Times, serif;
  }
  h1 { 
    font-size: 12pt; 
    text-align: center; 
    margin: 0 0 1em 0; 
    font-weight: bold;
  }
  .author-block { text-align: center; margin: 1em 0 2em 0; line-height: 2; }
  .author-name { font-size: 10pt; font-weight: normal; margin: 0; text-align: center; }
  .author-reg { font-size: 9pt; margin: 0; color: #333; text-align: center; }
  .author-affiliation { font-size: 9pt; font-style: italic; margin: 0; text-align: center; }
  .author-detail { font-size: 12pt; font-style: normal; margin: 0; text-align: center; }
  .keywords { font-size: 12pt; margin: 1em 0 2em 0; font-style: italic; }
  
  h2 { font-size: 12pt; margin: 1em 0 0; font-weight: bold; text-align: center; }
  h3 { font-size: 11pt; margin: 1em 0 0; font-weight: bold; font-style: italic; text-align: left; }
  p { text-align: left; margin: 0; text-indent: 0.5in; }
  
  table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 11pt; }
  table th, table td { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 8px; text-align: left; }
  table th { font-weight: bold; }
  .table-caption { text-align: left; font-weight: bold; font-size: 12pt; margin: 1em 0 0.3em 0; font-style: italic; }
  
  pre.figure { background: #fff; border: none; padding: 1em; margin: 1em auto; font-family: 'Courier New', monospace; font-size: 10pt; }
  .fig-caption { text-align: left; font-style: italic; font-size: 12pt; margin: 0.5em 0 1em 0; }
  
  ul, ol { margin: 0 0 0 0.5in; }
  li { margin-bottom: 0; }
  
  /* SVG Charts & Figures */
  .figure-container { text-align: center; margin: 1em auto; break-inside: avoid; }
  .figure-container svg { max-width: 100%; height: auto; display: inline-block; }
  .chart-container { text-align: center; margin: 1em auto; break-inside: avoid; }
  .chart-container svg { max-width: 100%; height: auto; }
`

// Modern Clean Format
const modernCleanCss = `
  @page { 
    size: A4; 
    margin: 1cm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  .page-frame {
    border: 3pt solid #2563eb;
    border-radius: 4pt;
    padding: 1.2cm;
    min-height: calc(100vh - 2cm);
    background: linear-gradient(to bottom, #f8fafc 0%, #fff 100px);
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  h1 { 
    font-size: 22pt; 
    text-align: center; 
    margin: 0 0 0.3em 0; 
    font-weight: 600;
    color: #1e40af;
    border-bottom: 2pt solid #2563eb;
    padding-bottom: 0.3em;
  }
  .author-block { text-align: center; margin: 0.5em 0 1.5em 0; }
  .author-name { font-size: 10pt; font-weight: 600; margin: 0.15em 0 0; color: #374151; text-align: center; }
  .author-reg { font-size: 9pt; margin: 0.05em 0; color: #6b7280; text-align: center; }
  .author-affiliation { font-size: 9pt; margin: 0.05em 0; color: #6b7280; font-style: italic; text-align: center; }
  .author-detail { font-size: 10pt; margin: 0.2em 0; color: #6b7280; }
  .keywords { 
    font-size: 10pt; 
    margin: 1em 0 1.5em 0; 
    padding: 0.5em 1em;
    background: #eff6ff;
    border-left: 3pt solid #2563eb;
    border-radius: 0 4pt 4pt 0;
  }
  
  h2 { 
    font-size: 14pt; 
    margin: 1.5em 0 0.6em 0; 
    font-weight: 600; 
    color: #1e40af;
    border-bottom: 1pt solid #dbeafe;
    padding-bottom: 0.2em;
  }
  h3 { font-size: 12pt; margin: 1em 0 0.4em 0; font-weight: 600; color: #3b82f6; }
  p { text-align: justify; margin: 0 0 0.8em 0; }
  
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 1em 0; 
    font-size: 10pt;
    border-radius: 4pt;
    overflow: hidden;
  }
  table th, table td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
  table th { background: #2563eb; color: #fff; font-weight: 600; }
  table tr:nth-child(even) { background: #f9fafb; }
  .table-caption { text-align: center; font-weight: 600; font-size: 10pt; margin: 1em 0 0.4em 0; color: #374151; }
  
  pre.figure { 
    background: #f8fafc; 
    border: 1px solid #e5e7eb; 
    border-radius: 6pt;
    padding: 1em; 
    margin: 1em auto; 
    max-width: 90%;
    font-family: 'Consolas', 'Monaco', monospace; 
    font-size: 9pt;
  }
  .fig-caption { text-align: center; font-style: italic; font-size: 10pt; margin: 0.4em 0 1em 0; color: #6b7280; }
  
  ul, ol { margin: 0.5em 0 0.8em 1.5em; }
  li { margin-bottom: 0.3em; }
  strong { font-weight: 600; }
  em { font-style: italic; }
  
  /* SVG Charts & Figures */
  .figure-container { text-align: center; margin: 1em auto; break-inside: avoid; }
  .figure-container svg { max-width: 100%; height: auto; display: inline-block; }
  .chart-container { text-align: center; margin: 1em auto; break-inside: avoid; }
  .chart-container svg { max-width: 100%; height: auto; }
`

// Classic Academic Format
const classicAcademicCss = `
  @page { 
    size: A4; 
    margin: 1cm;
    @bottom-center { content: "— " counter(page) " —"; font-size: 10pt; font-family: 'Georgia'; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  .page-frame {
    border: double 4pt #000;
    padding: 1.5cm;
    min-height: calc(100vh - 2cm);
    background: #fffef7;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  h1 { 
    font-size: 20pt; 
    text-align: center; 
    margin: 0 0 0.5em 0; 
    font-weight: normal;
    font-variant: small-caps;
    letter-spacing: 2pt;
  }
  .author-block { text-align: center; margin: 1em 0 2em 0; }
  .author-name { font-size: 10pt; font-weight: normal; font-variant: small-caps; margin: 0.15em 0 0; text-align: center; }
  .author-reg { font-size: 9pt; margin: 0.05em 0; color: #333; text-align: center; }
  .author-affiliation { font-size: 9pt; font-style: italic; margin: 0.05em 0; text-align: center; }
  .author-detail { font-size: 10pt; font-style: italic; margin: 0.2em 0; }
  .keywords { font-size: 10pt; margin: 1em 0 2em 0; text-align: center; font-style: italic; }
  
  h2 { 
    font-size: 13pt; 
    margin: 1.5em 0 0.6em 0; 
    font-weight: normal;
    font-variant: small-caps;
    letter-spacing: 1pt;
    border-bottom: 1pt solid #000;
    padding-bottom: 0.2em;
  }
  h3 { font-size: 11pt; margin: 1em 0 0.4em 0; font-weight: bold; font-style: italic; }
  p { text-align: justify; margin: 0 0 1em 0; text-indent: 2em; }
  p:first-of-type { text-indent: 0; }
  
  table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 10pt; }
  table th, table td { border: 1px solid #666; padding: 8px; text-align: left; }
  table th { background: #f5f5f0; font-variant: small-caps; font-weight: normal; }
  .table-caption { text-align: center; font-variant: small-caps; font-size: 10pt; margin: 1em 0 0.4em 0; letter-spacing: 1pt; }
  
  pre.figure { background: #f9f9f5; border: 1px solid #ccc; padding: 1em; margin: 1em auto; max-width: 85%; font-family: 'Courier New', monospace; font-size: 9pt; }
  .fig-caption { text-align: center; font-style: italic; font-size: 10pt; margin: 0.4em 0 1em 0; }
  
  ul, ol { margin: 0.5em 0 1em 2em; }
  li { margin-bottom: 0.4em; }
  
  /* SVG Charts & Figures */
  .figure-container { text-align: center; margin: 1em auto; break-inside: avoid; }
  .figure-container svg { max-width: 100%; height: auto; display: inline-block; }
  .chart-container { text-align: center; margin: 1em auto; break-inside: avoid; }
  .chart-container svg { max-width: 100%; height: auto; }
`

export const FORMAT_TEMPLATES: FormatTemplate[] = [
  {
    id: 'ieee-two-column',
    name: 'IEEE Two-Column',
    description: 'Standard IEEE conference/journal format with two columns, ideal for technical papers',
    preview: 'Two columns, compact, professional',
    css: ieeetwocolumncss,
  },
  {
    id: 'ieee-single-column',
    name: 'IEEE Single Column',
    description: 'IEEE format in single column layout, easier to read on screen',
    preview: 'Single column, IEEE styling',
    css: ieeeSingleColumnCss,
  },
  {
    id: 'apa-7th',
    name: 'APA 7th Edition',
    description: 'American Psychological Association format, double-spaced with 1-inch margins',
    preview: 'Double-spaced, clean headers',
    css: apaFormatCss,
  },
  {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'Contemporary design with blue accents and clean typography',
    preview: 'Sans-serif, colorful, modern',
    css: modernCleanCss,
  },
  {
    id: 'classic-academic',
    name: 'Classic Academic',
    description: 'Traditional scholarly style with elegant typography and ornate borders',
    preview: 'Serif, elegant, traditional',
    css: classicAcademicCss,
  },
]

export function getFormatCss(formatId: string): string {
  const template = FORMAT_TEMPLATES.find(t => t.id === formatId)
  return template?.css || FORMAT_TEMPLATES[0].css
}

export function wrapContentForFormat(content: string, formatId: string): string {
  // For two-column format, split into full-width front-matter and two-column body
  if (formatId === 'ieee-two-column') {
    // Strategy: Title + Authors + Abstract + Keywords go into single-column front-matter.
    // Everything from the first numbered section heading (I., II., etc.) goes into two-column body.
    const bodyStartRegex = /<h2[^>]*>\s*(I\.|II\.|III\.|IV\.|V\.|VI\.|VII\.|VIII\.|IX\.|X\.|1\.|2\.)/i
    const bodyMatch = bodyStartRegex.exec(content)
    
    let frontMatter = ''
    let bodyContent = ''
    
    if (bodyMatch && bodyMatch.index > 0) {
      frontMatter = content.slice(0, bodyMatch.index).trim()
      bodyContent = content.slice(bodyMatch.index).trim()
    } else {
      // Fallback: find first <h2> that is NOT Abstract
      const fallbackRegex = /<h2[^>]*>(?!\s*Abstract)/i
      const fallbackMatch = fallbackRegex.exec(content)
      if (fallbackMatch && fallbackMatch.index > 0) {
        frontMatter = content.slice(0, fallbackMatch.index).trim()
        bodyContent = content.slice(fallbackMatch.index).trim()
      } else {
        // No split possible — everything goes single-column
        return `<div class="page-frame">${content}</div>`
      }
    }
    
    return `<div class="page-frame">
      <div class="front-matter">
        ${frontMatter}
      </div>
      <div class="two-column">
        ${bodyContent}
      </div>
    </div>`
  }
  
  // For APA format - add running head support
  if (formatId === 'apa-7th') {
    const titleMatch = content.match(/(<h1[^>]*>[\s\S]*?<\/h1>)/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim().toUpperCase() : 'RUNNING HEAD'
    const shortTitle = title.length > 50 ? title.substring(0, 50) + '...' : title
    
    return `<div class="page-frame">
      <div class="running-head">${shortTitle}</div>
      ${content}
    </div>`
  }
  
  // For other formats, just wrap in page-frame
  return `<div class="page-frame">${content}</div>`
}
