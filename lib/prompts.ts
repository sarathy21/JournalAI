export interface PaperOptions {
  topic: string
  domain: string
  citationStyle: 'IEEE' | 'APA' | 'MLA'
  wordCount: number
  pageCount?: number
  authors?: { name: string; registerNumber: string }[]
  affiliation?: string
  department?: string
  college?: string
  proposedIdea?: string
  // Legacy single-author fields (backwards compat)
  authorName?: string
  registerNumber?: string
}

export interface SectionPrompt {
  sectionName: string
  systemMessage: string
  userPrompt: string
  minWords: number
}

/**
 * Detects the paper type from topic and domain to choose section structure.
 * Returns 'empirical' (experiments/data), 'theoretical' (analysis/framework),
 * or 'review' (survey/comparison).
 */
function detectPaperType(topic: string, domain: string): 'empirical' | 'theoretical' | 'review' {
  const t = (topic + ' ' + domain).toLowerCase()

  // Review/Survey papers
  if (/\b(survey|review|systematic review|meta[- ]analysis|comparison of|comparative (study|analysis)|state[- ]of[- ]the[- ]art|bibliometric)\b/.test(t)) {
    return 'review'
  }

  // Theoretical/Analytical papers (humanities, ethics, law, philosophy, history, policy, framework)
  if (/\b(ethic|moral|philosophy|philosophical|legal|law|legislation|human rights|history|historical|literary|criticism|rhetoric|political theory|policy analysis|social theory|theology|aesthetics|cultural studies|hermeneutic|phenomenolog|epistemolog|ontolog)\b/.test(t)) {
    return 'theoretical'
  }

  // Domain-based detection
  const theoreticalDomains = /\b(philosophy|ethics|law|history|literature|political science|sociology|anthropology|religious studies|cultural studies|linguistics|art history|music theory|education theory)\b/i
  if (theoreticalDomains.test(domain)) {
    return 'theoretical'
  }

  // Default for STEM, business, etc.
  return 'empirical'
}

/**
 * Splits the paper into focused section prompts.
 * Section structure adapts based on topic/domain type:
 * - Empirical: Intro → Literature Review → Methodology → Results → Discussion → Conclusion
 * - Theoretical: Intro → Background → Framework/Analysis → Critical Analysis → Implications → Conclusion
 * - Review: Intro → Background → Systematic Review → Comparative Analysis → Synthesis → Conclusion
 */
export function buildSectionPrompts(options: PaperOptions): SectionPrompt[] {
  const { topic, domain, citationStyle, wordCount, pageCount } = options

  // ── Build author block ────────────────────────────────────────────────
  const authors = options.authors?.length
    ? options.authors
    : [{ name: options.authorName || 'Author Name', registerNumber: options.registerNumber || '' }]
  const department = options.department || ''
  const college = options.college || ''
  const affiliation = options.affiliation || ''
  const proposedIdea = options.proposedIdea || ''

  // 850 words per A4 page (IEEE two-column dense text)
  const targetWords = pageCount ? pageCount * 850 : wordCount

  // ── Section budgets ───────────────────────────────────────────────────
  const w = {
    intro:          Math.round(targetWords * 0.12),
    litRev:         Math.round(targetWords * 0.16),
    existingSys:    Math.round(targetWords * 0.12),
    proposedWork:   Math.round(targetWords * 0.22),
    resultsDisc:    Math.round(targetWords * 0.24),
    conclusion:     Math.round(targetWords * 0.14),
  }

  // Build author lines for HTML — each author stacked vertically
  const authorNamesHtml = authors
    .map(a => `<p class="author-name">${a.name}</p>${a.registerNumber ? `\n<p class="author-reg">${a.registerNumber}</p>` : ''}`)
    .join('\n')

  const affiliationLines = [department, college, affiliation].filter(Boolean)
  const affiliationHtml = affiliationLines
    .map(line => `<p class="author-affiliation">${line}</p>`)
    .join('\n')

  const authorBlock = `<div class="author-block">
${authorNamesHtml}
${affiliationHtml}
</div>`

  const refCount = targetWords > 5000 ? '25-35' : '12-18'

  // Shared system instruction injected into every section system message
  const baseSystem = `You are a professional IEEE academic paper writer with 20 years of experience.

CRITICAL DATA ACCURACY AND INTEGRITY RULES (MUST follow every one):
- NEVER fabricate specific statistics, percentages, or numerical data. Use realistic ranges or hypothetical scenarios clearly marked.
- NEVER invent author names, journal names, or DOIs for citations. Use descriptive placeholders like "[Author et al., Year]" OR state "recent studies suggest..."
- For methodology and results: describe realistic approaches and plausible outcomes, but do NOT claim specific experimental results unless they are well-known facts.
- Use phrases like "studies indicate", "research suggests", "typically ranges from" instead of specific fabricated numbers.
- If discussing real technologies, frameworks, or methods, be accurate about their actual capabilities and limitations.
- ALL claims, statistics, and findings MUST be plausible and consistent with real-world knowledge. Do NOT invent fantastical results.
- When citing existing research, use ONLY well-known, verifiable facts. If uncertain, use generic but honest phrasing ("prior work has shown...").
- Numerical results in tables MUST be internally consistent — totals must sum correctly, percentages must add to ~100%, improvements must match base vs proposed values.
- Do NOT contradict yourself across sections. Ensure methodology described matches findings presented and discussion references.
- Cross-reference consistency: if the introduction mentions 3 research questions, the results must address all 3, and the conclusion must summarize all 3.
- Avoid p-hacking language. If reporting p-values, keep them realistic (e.g., p < 0.05, p < 0.01) and consistent with the described sample sizes.
- All technical terms must be used correctly (e.g., do not confuse precision/recall, accuracy/F1-score, correlation/causation).

FORMAT RULES — follow every rule without exception:
1. Output ONLY valid HTML. No markdown, no asterisks, no backticks, no code fences.
2. NEVER output placeholder text, bracket instructions, or template markers. Write the actual paper content.
3. Every <p> tag must contain real, fully-written academic prose — not instructions or descriptions of content.
4. Use text-align:justify on every paragraph: <p style="text-align:justify">
5. IEEE section numbering: I. II. III. IV. V. VI. (Roman numerals)
6. IEEE subsection lettering: A. B. C. (capital letters)
7. Tables: <table> with <thead>/<tbody>/<tr>/<th>/<td>. Caption above: <p class="table-caption">Table I: Title</p>
8. FIGURES & CHARTS — use inline SVG. CRITICAL RULES:
   - Wrap every figure in: <div class="figure-container">...<p class="fig-caption">Fig. N. Caption</p></div>
   - SVG elements MUST contain ONLY valid SVG markup: <rect>, <circle>, <line>, <polyline>, <path>, <text>, <defs>, <marker> etc.
   - NEVER put English prose, instructions, or descriptions inside <svg>...</svg> tags. Only SVG elements.
   - Use viewBox="0 0 350 250" for all figures. Always set xmlns="http://www.w3.org/2000/svg".
   - Always include a <defs> section with arrowhead markers for flowcharts.
   - Use font-size="10" or font-size="11" for all <text> elements inside SVG.
   - Every figure must have a unique distinct color theme — do NOT use the same palette for different figures.
9. Citations in IEEE style: [1], [2], [1]–[4]
10. Each paragraph must be 120–200 words of substantive academic content.
11. MANDATORY WORD COUNT: Every section system message specifies the minimum word count. YOU MUST reach that word count before stopping. If you run out of obvious content, add more analysis, examples, comparisons, or implications paragraphs. Do NOT stop early under any circumstances. Your output is automatically word-counted and sections below the minimum will be marked incomplete.
12. When you think you are done — check if you have reached the minimum. If not, write more <p> paragraphs with deeper analysis until you do.
13. Include at least 6-8 figures total across the paper: architecture/flow diagrams, bar charts, pie charts, line graphs, or comparison charts as appropriate for the content. Every major section should have at least one figure.`

  const paperType = detectPaperType(topic, domain)
  const ctx: SectionBuildContext = { topic, domain, citationStyle, w, authorBlock, refCount, baseSystem, proposedIdea }

  // ─── Build sections based on paper type ────────────────────────────────
  if (paperType === 'theoretical') {
    return buildTheoreticalSections(ctx)
  }
  if (paperType === 'review') {
    return buildReviewSections(ctx)
  }
  // Default: empirical
  return buildEmpiricalSections(ctx)
}

interface SectionBuildContext {
  topic: string; domain: string; citationStyle: string
  w: Record<string, number>; authorBlock: string; refCount: string; baseSystem: string
  proposedIdea: string
}

// ════════════════════════════════════════════════════════════════════════════
// EMPIRICAL paper sections
// Structure: Intro → Lit Review → Existing System → Proposed Work → Results & Discussion → Conclusion → References
// ════════════════════════════════════════════════════════════════════════════
function buildEmpiricalSections(ctx: SectionBuildContext): SectionPrompt[] {
  const { topic, domain, citationStyle, w, authorBlock, refCount, baseSystem, proposedIdea } = ctx

  const proposedIdeaBlock = proposedIdea
    ? `\n\nUSER'S PROPOSED SYSTEM / IDEA (incorporate and expand on this):\n${proposedIdea}`
    : '\n\nThe user has not specified a proposed system — design a novel, well-reasoned approach based on recent advances in the field.'

  return [
    // ── SECTION 1: Front Matter + Introduction ──────────────────────────
    {
      sectionName: 'Front Matter & Introduction',
      systemMessage: `${baseSystem}\nWrite ONLY the front matter and introduction. Target: minimum ${w.intro + 450} words.`,
      userPrompt: `Write the front matter and introduction for an IEEE academic paper:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Produce the following HTML elements IN ORDER:

1. Title: <h1>${topic}</h1>

2. Author block exactly as:
${authorBlock}

3. Abstract:
<h2>Abstract</h2>
<p style="text-align:justify"><em><strong>Abstract—</strong> Write a single paragraph of at least 350 words. Cover: background context, the specific problem in ${domain}, research objectives, proposed methodology, key findings, and significance of the work. Be fully self-contained.</em></p>

4. Keywords (immediately after abstract):
<p class="keywords"><strong>Keywords—</strong> list 8–10 specific academic keywords for ${topic}, separated by commas.</p>

5. Introduction:
<h2>I. INTRODUCTION</h2>
Write at least 7 separate paragraphs (${w.intro} words min), each in <p style="text-align:justify">:
- P1: Broad background of ${domain} and importance of ${topic}.
- P2: The specific problem or challenge and its real-world consequences.
- P3: How current systems/approaches handle this problem (brief overview).
- P4: Limitations and gaps in existing approaches.
- P5: Research objectives, questions, and the gap this paper fills.
- P6: Brief overview of the proposed approach/system and its novelty.
- P7: Roadmap — Section II reviews literature, Section III describes the existing system, Section IV presents the proposed work and methodology, Section V shows results and discussion, Section VI concludes, Section VII lists references.

Begin with <h1>.`,
      minWords: w.intro + 450,
    },

    // ── SECTION 2: Literature Review ────────────────────────────────────
    {
      sectionName: 'Literature Review',
      systemMessage: `${baseSystem}\nWrite ONLY the Literature Review section. Target: minimum ${w.litRev} words.`,
      userPrompt: `Write Section II (Literature Review) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>II. LITERATURE REVIEW</h2>

Write a 2-sentence overview paragraph.

Then write three subsections:

<h3>A. Theoretical Background</h3>
Write at least ${Math.round(w.litRev * 0.30)} words.
Discuss foundational theories, models, and frameworks for ${topic}. Reference at least 6 seminal works with [1], [2] citations.

After this subsection, include:
<p class="table-caption">Table I: Summary of Related Works</p>
<table>
  <thead><tr><th>Author(s)</th><th>Year</th><th>Approach</th><th>Key Findings</th><th>Limitations</th></tr></thead>
  <tbody>(6–8 rows)</tbody>
</table>

<h3>B. Recent Studies and Emerging Trends</h3>
Write at least ${Math.round(w.litRev * 0.40)} words.
Review 8–12 recent studies. For each: methodology, dataset, findings, limitations. Use ${citationStyle} citations.

After this subsection, reproduce this SVG line chart (TEAL theme) adapted with real year labels and values for ${topic}:
<div class="figure-container">
<svg viewBox="0 0 350 230" xmlns="http://www.w3.org/2000/svg">
  <rect width="350" height="230" fill="#E0F7FA" rx="4"/>
  <text x="175" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#006064">Publication Trends: ${topic}</text>
  <!-- Y-axis -->
  <line x1="50" y1="25" x2="50" y2="185" stroke="#00838F" stroke-width="1.5"/>
  <!-- X-axis -->
  <line x1="50" y1="185" x2="330" y2="185" stroke="#00838F" stroke-width="1.5"/>
  <!-- Gridlines -->
  <line x1="50" y1="65" x2="330" y2="65" stroke="#B2EBF2" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="50" y1="105" x2="330" y2="105" stroke="#B2EBF2" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="50" y1="145" x2="330" y2="145" stroke="#B2EBF2" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Y labels -->
  <text x="44" y="68" text-anchor="end" font-size="9" fill="#00838F">75</text>
  <text x="44" y="108" text-anchor="end" font-size="9" fill="#00838F">50</text>
  <text x="44" y="148" text-anchor="end" font-size="9" fill="#00838F">25</text>
  <text x="44" y="188" text-anchor="end" font-size="9" fill="#00838F">0</text>
  <text x="22" y="115" text-anchor="middle" font-size="9" fill="#006064" transform="rotate(-90,22,115)">Publications</text>
  <!-- REPLACE x-label years and polyline points with actual trend data for ${topic} -->
  <text x="80" y="200" text-anchor="middle" font-size="9" fill="#006064">2018</text>
  <text x="120" y="200" text-anchor="middle" font-size="9" fill="#006064">2019</text>
  <text x="160" y="200" text-anchor="middle" font-size="9" fill="#006064">2020</text>
  <text x="200" y="200" text-anchor="middle" font-size="9" fill="#006064">2021</text>
  <text x="240" y="200" text-anchor="middle" font-size="9" fill="#006064">2022</text>
  <text x="280" y="200" text-anchor="middle" font-size="9" fill="#006064">2023</text>
  <text x="320" y="200" text-anchor="middle" font-size="9" fill="#006064">2024</text>
  <!-- Main trend line (REPLACE y-coords to reflect actual growth trend) -->
  <polyline points="80,170 120,160 160,145 200,120 240,95 280,70 320,50" fill="none" stroke="#00838F" stroke-width="2.5"/>
  <circle cx="80" cy="170" r="4" fill="#00838F"/><circle cx="120" cy="160" r="4" fill="#00838F"/>
  <circle cx="160" cy="145" r="4" fill="#00838F"/><circle cx="200" cy="120" r="4" fill="#00838F"/>
  <circle cx="240" cy="95" r="4" fill="#00838F"/><circle cx="280" cy="70" r="4" fill="#00838F"/>
  <circle cx="320" cy="50" r="4" fill="#006064"/>
  <!-- Optional second line for comparison domain -->
  <polyline points="80,175 120,168 160,155 200,138 240,115 280,92 320,72" fill="none" stroke="#26C6DA" stroke-width="2" stroke-dasharray="5,3"/>
  <!-- Legend -->
  <line x1="60" y1="215" x2="80" y2="215" stroke="#00838F" stroke-width="2.5"/>
  <text x="83" y="218" font-size="9" fill="#006064">${topic}</text>
  <line x1="175" y1="215" x2="195" y2="215" stroke="#26C6DA" stroke-width="2" stroke-dasharray="5,3"/>
  <text x="198" y="218" font-size="9" fill="#006064">Related field</text>
</svg>
<p class="fig-caption">Fig. 1. Research publication trends in ${topic} (2018–2024)</p>
</div>

<h3>C. Research Gaps</h3>
Write at least ${Math.round(w.litRev * 0.20)} words.
Identify 3+ specific gaps. For each, explain why it matters and how this paper fills it.

<h3>D. Comparative Summary of Literature</h3>
Write at least ${Math.round(w.litRev * 0.10)} words.
Summarize the key takeaways from the literature, clearly showing how existing approaches differ and where the field is heading. Conclude by stating how this paper addresses the most critical unresolved issues.

Begin with <h2>II. LITERATURE REVIEW</h2>.`,
      minWords: w.litRev,
    },

    // ── SECTION 3: Existing System ──────────────────────────────────────
    {
      sectionName: 'Existing System',
      systemMessage: `${baseSystem}\nWrite ONLY the Existing System section. Target: minimum ${w.existingSys} words.`,
      userPrompt: `Write Section III (Existing System) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>III. EXISTING SYSTEM</h2>

Write a 3-sentence overview of current/existing approaches to the problem.

Then reproduce this SVG architecture diagram (ORANGE theme) adapted with real component names for existing ${topic} systems:
<div class="figure-container">
<svg viewBox="0 0 350 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrOr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#E65100"/>
    </marker>
  </defs>
  <rect width="350" height="280" fill="#FFF8F0" rx="4"/>
  <text x="175" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#BF360C">Existing ${topic} System Architecture</text>
  <!-- Box 1: REPLACE label with real existing system input stage -->
  <rect x="110" y="22" width="130" height="34" rx="5" fill="#FFE0B2" stroke="#EF6C00" stroke-width="1.5"/>
  <text x="175" y="44" text-anchor="middle" font-size="10" fill="#BF360C" font-weight="bold">Data Input Layer</text>
  <line x1="175" y1="56" x2="175" y2="68" stroke="#E65100" stroke-width="1.5" marker-end="url(#arrOr)"/>
  <!-- Box 2 -->
  <rect x="110" y="68" width="130" height="34" rx="5" fill="#FFCC80" stroke="#EF6C00" stroke-width="1.5"/>
  <text x="175" y="90" text-anchor="middle" font-size="10" fill="#BF360C" font-weight="bold">Pre-Processing</text>
  <line x1="175" y1="102" x2="175" y2="114" stroke="#E65100" stroke-width="1.5" marker-end="url(#arrOr)"/>
  <!-- Box 3 (wide center) -->
  <rect x="60" y="114" width="230" height="34" rx="5" fill="#FFB74D" stroke="#EF6C00" stroke-width="1.5"/>
  <text x="175" y="136" text-anchor="middle" font-size="10" fill="#BF360C" font-weight="bold">Core Processing Engine</text>
  <!-- Split arrowsto box 4 and 5 -->
  <line x1="120" y1="148" x2="95" y2="160" stroke="#E65100" stroke-width="1.5" marker-end="url(#arrOr)"/>
  <line x1="230" y1="148" x2="255" y2="160" stroke="#E65100" stroke-width="1.5" marker-end="url(#arrOr)"/>
  <!-- Box 4 -->
  <rect x="30" y="160" width="120" height="34" rx="5" fill="#FFE0B2" stroke="#EF6C00" stroke-width="1.5"/>
  <text x="90" y="182" text-anchor="middle" font-size="10" fill="#BF360C" font-weight="bold">Analysis Module</text>
  <!-- Box 5 -->
  <rect x="200" y="160" width="120" height="34" rx="5" fill="#FFE0B2" stroke="#EF6C00" stroke-width="1.5"/>
  <text x="260" y="182" text-anchor="middle" font-size="10" fill="#BF360C" font-weight="bold">Storage Layer</text>
  <!-- Converge arrows to box 6 -->
  <line x1="90" y1="194" x2="130" y2="222" stroke="#E65100" stroke-width="1.5" marker-end="url(#arrOr)"/>
  <line x1="260" y1="194" x2="220" y2="222" stroke="#E65100" stroke-width="1.5" marker-end="url(#arrOr)"/>
  <!-- Box 6 (output) -->
  <rect x="110" y="222" width="130" height="34" rx="5" fill="#FFB74D" stroke="#EF6C00" stroke-width="2"/>
  <text x="175" y="244" text-anchor="middle" font-size="10" fill="#BF360C" font-weight="bold">Output / Results</text>
  <!-- NOTE: Adapt ALL box labels above to match real existing system components for ${topic} -->
</svg>
<p class="fig-caption">Fig. 2. Architecture of the existing system for ${topic}</p>
</div>

Then write three subsections:

<h3>A. Overview of Current Approaches</h3>
Write at least ${Math.round(w.existingSys * 0.35)} words.
Describe the most common existing systems, tools, or methods currently used for ${topic} in ${domain}. Explain how they work, their architecture, and key components.

<h3>B. Advantages of Existing Methods</h3>
Write at least ${Math.round(w.existingSys * 0.25)} words.
Acknowledge what existing systems do well. List their strengths, deployed applications, and achieved benchmarks.

<h3>C. Limitations and Drawbacks</h3>
Write at least ${Math.round(w.existingSys * 0.40)} words.
Critically analyze the shortcomings: performance bottlenecks, scalability issues, accuracy limitations, cost, usability problems. Present these as the motivation for the proposed work. Include:

<p class="table-caption">Table II: Limitations of Existing Approaches</p>
<table>
  <thead><tr><th>Existing Method</th><th>Strength</th><th>Limitation</th><th>Impact on ${topic}</th></tr></thead>
  <tbody>(5–7 rows)</tbody>
</table>

Begin with <h2>III. EXISTING SYSTEM</h2>.`,
      minWords: w.existingSys,
    },

    // ── SECTION 4: Proposed Work & Methodology ──────────────────────────
    {
      sectionName: 'Proposed Work & Methodology',
      systemMessage: `${baseSystem}\nWrite ONLY the Proposed Work and Methodology section. Target: minimum ${w.proposedWork} words.`,
      userPrompt: `Write Section IV (Proposed Work and Methodology) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
${proposedIdeaBlock}

Begin with: <h2>IV. PROPOSED WORK AND METHODOLOGY</h2>

Write a 3-sentence overview of what is being proposed and why it is superior to existing approaches.

Then reproduce this SVG architecture diagram (PURPLE theme) adapted with real component names for the proposed ${topic} system:
<div class="figure-container">
<svg viewBox="0 0 350 310" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrPu" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#4A148C"/>
    </marker>
  </defs>
  <rect width="350" height="310" fill="#F3E5F5" rx="4"/>
  <text x="175" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#4A148C">Proposed ${topic} System</text>
  <!-- Input -->
  <rect x="115" y="24" width="120" height="32" rx="16" fill="#CE93D8" stroke="#7B1FA2" stroke-width="1.5"/>
  <text x="175" y="44" text-anchor="middle" font-size="10" fill="#4A148C" font-weight="bold">User Input</text>
  <line x1="175" y1="56" x2="175" y2="68" stroke="#7B1FA2" stroke-width="1.5" marker-end="url(#arrPu)"/>
  <!-- Module 1 -->
  <rect x="115" y="68" width="120" height="32" rx="5" fill="#E1BEE7" stroke="#7B1FA2" stroke-width="1.5"/>
  <text x="175" y="88" text-anchor="middle" font-size="10" fill="#4A148C" font-weight="bold">Data Preprocessing</text>
  <line x1="175" y1="100" x2="175" y2="112" stroke="#7B1FA2" stroke-width="1.5" marker-end="url(#arrPu)"/>
  <!-- Central hub -->
  <rect x="60" y="112" width="230" height="32" rx="5" fill="#AB47BC" stroke="#4A148C" stroke-width="2"/>
  <text x="175" y="132" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold">Intelligent Processing Core</text>
  <!-- Branch left -->
  <line x1="115" y1="144" x2="85" y2="158" stroke="#7B1FA2" stroke-width="1.5" marker-end="url(#arrPu)"/>
  <rect x="22" y="158" width="126" height="32" rx="5" fill="#E1BEE7" stroke="#7B1FA2" stroke-width="1.5"/>
  <text x="85" y="178" text-anchor="middle" font-size="10" fill="#4A148C" font-weight="bold">Feature Extraction</text>
  <!-- Branch right -->
  <line x1="235" y1="144" x2="265" y2="158" stroke="#7B1FA2" stroke-width="1.5" marker-end="url(#arrPu)"/>
  <rect x="202" y="158" width="126" height="32" rx="5" fill="#E1BEE7" stroke="#7B1FA2" stroke-width="1.5"/>
  <text x="265" y="178" text-anchor="middle" font-size="10" fill="#4A148C" font-weight="bold">Optimization Layer</text>
  <!-- Converge -->
  <line x1="85" y1="190" x2="130" y2="222" stroke="#7B1FA2" stroke-width="1.5" marker-end="url(#arrPu)"/>
  <line x1="265" y1="190" x2="220" y2="222" stroke="#7B1FA2" stroke-width="1.5" marker-end="url(#arrPu)"/>
  <!-- Decision -->
  <rect x="95" y="222" width="160" height="32" rx="5" fill="#CE93D8" stroke="#7B1FA2" stroke-width="1.5"/>
  <text x="175" y="242" text-anchor="middle" font-size="10" fill="#4A148C" font-weight="bold">Decision &amp; Validation</text>
  <line x1="175" y1="254" x2="175" y2="266" stroke="#7B1FA2" stroke-width="1.5" marker-end="url(#arrPu)"/>
  <!-- Output -->
  <rect x="115" y="266" width="120" height="32" rx="16" fill="#AB47BC" stroke="#4A148C" stroke-width="2"/>
  <text x="175" y="286" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold">Output Results</text>
  <!-- NOTE: Replace ALL box labels with actual proposed system components for ${topic} -->
</svg>
<p class="fig-caption">Fig. 3. Architecture of the proposed ${topic} system</p>
</div>

Then write four subsections:

<h3>A. System Design and Architecture</h3>
Write at least ${Math.round(w.proposedWork * 0.30)} words.
Describe the overall design of the proposed system/method. Explain each component, module, or stage in detail. Discuss design decisions and rationale.

<h3>B. Algorithm / Methodology</h3>
Write at least ${Math.round(w.proposedWork * 0.30)} words.
Detail the specific algorithms, techniques, mathematical formulations, or protocols. If applicable, present pseudocode inside <pre> tags. Explain step-by-step how the proposed approach works.

<h3>C. Implementation Details</h3>
Write at least ${Math.round(w.proposedWork * 0.20)} words.
Describe tools, frameworks, libraries, hardware, and software used. Specify versions. Explain dataset preparation, preprocessing, training procedures, or experimental setup.

<h3>D. Novelty and Advantages Over Existing System</h3>
Write at least ${Math.round(w.proposedWork * 0.20)} words.
Explicitly compare the proposed approach with the existing system described in Section III. Highlight specific improvements. Include:

<div class="figure-container">
<svg viewBox="0 0 350 230" xmlns="http://www.w3.org/2000/svg">
  <rect width="350" height="230" fill="#F1F8E9" rx="4"/>
  <text x="175" y="15" text-anchor="middle" font-size="11" font-weight="bold" fill="#1B5E20">Existing vs Proposed: ${topic}</text>
  <!-- Axes -->
  <line x1="55" y1="25" x2="55" y2="178" stroke="#2E7D32" stroke-width="1.5"/>
  <line x1="55" y1="178" x2="340" y2="178" stroke="#2E7D32" stroke-width="1.5"/>
  <!-- Y gridlines -->
  <line x1="55" y1="58" x2="340" y2="58" stroke="#C8E6C9" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="88" x2="340" y2="88" stroke="#C8E6C9" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="118" x2="340" y2="118" stroke="#C8E6C9" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="148" x2="340" y2="148" stroke="#C8E6C9" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Y labels -->
  <text x="50" y="61" text-anchor="end" font-size="9" fill="#2E7D32">100%</text>
  <text x="50" y="91" text-anchor="end" font-size="9" fill="#2E7D32">75%</text>
  <text x="50" y="121" text-anchor="end" font-size="9" fill="#2E7D32">50%</text>
  <text x="50" y="151" text-anchor="end" font-size="9" fill="#2E7D32">25%</text>
  <text x="30" y="110" text-anchor="middle" font-size="9" fill="#1B5E20" transform="rotate(-90,30,110)">Score (%)</text>
  <!-- Group 1 (REPLACE metric names and bar heights with actual ${topic} data) -->
  <rect x="68" y="78" width="22" height="100" fill="#E57373"/>
  <rect x="92" y="53" width="22" height="125" fill="#43A047"/>
  <text x="86" y="192" text-anchor="middle" font-size="8" fill="#1B5E20">Accuracy</text>
  <!-- Group 2 -->
  <rect x="135" y="98" width="22" height="80" fill="#E57373"/>
  <rect x="159" y="63" width="22" height="115" fill="#43A047"/>
  <text x="153" y="192" text-anchor="middle" font-size="8" fill="#1B5E20">Precision</text>
  <!-- Group 3 -->
  <rect x="202" y="108" width="22" height="70" fill="#E57373"/>
  <rect x="226" y="68" width="22" height="110" fill="#43A047"/>
  <text x="220" y="192" text-anchor="middle" font-size="8" fill="#1B5E20">Recall</text>
  <!-- Group 4 -->
  <rect x="269" y="118" width="22" height="60" fill="#E57373"/>
  <rect x="293" y="73" width="22" height="105" fill="#43A047"/>
  <text x="287" y="192" text-anchor="middle" font-size="8" fill="#1B5E20">F1-Score</text>
  <!-- Value labels (REPLACE with actual values) -->
  <text x="79" y="75" text-anchor="middle" font-size="8" fill="#C62828">70%</text>
  <text x="103" y="50" text-anchor="middle" font-size="8" fill="#1B5E20">88%</text>
  <text x="146" y="95" text-anchor="middle" font-size="8" fill="#C62828">66%</text>
  <text x="170" y="60" text-anchor="middle" font-size="8" fill="#1B5E20">85%</text>
  <text x="213" y="105" text-anchor="middle" font-size="8" fill="#C62828">62%</text>
  <text x="237" y="65" text-anchor="middle" font-size="8" fill="#1B5E20">83%</text>
  <text x="280" y="115" text-anchor="middle" font-size="8" fill="#C62828">60%</text>
  <text x="304" y="70" text-anchor="middle" font-size="8" fill="#1B5E20">81%</text>
  <!-- Legend -->
  <rect x="80" y="207" width="12" height="10" fill="#E57373"/>
  <text x="95" y="217" font-size="9" fill="#C62828">Existing</text>
  <rect x="185" y="207" width="12" height="10" fill="#43A047"/>
  <text x="200" y="217" font-size="9" fill="#1B5E20">Proposed</text>
</svg>
<p class="fig-caption">Fig. 7. Metric-wise comparison of existing and proposed systems for ${topic}</p>
</div>

<p class="table-caption">Table III: Comparison — Existing vs Proposed System</p>
<table>
  <thead><tr><th>Feature / Aspect</th><th>Existing System</th><th>Proposed System</th><th>Improvement</th></tr></thead>
  <tbody>(6–8 rows)</tbody>
</table>

Begin with <h2>IV. PROPOSED WORK AND METHODOLOGY</h2>.`,
      minWords: w.proposedWork,
    },

    // ── SECTION 5: Results and Discussion ────────────────────────────────
    {
      sectionName: 'Results and Discussion',
      systemMessage: `${baseSystem}\nWrite ONLY the Results and Discussion section. Target: minimum ${w.resultsDisc} words.`,
      userPrompt: `Write Section V (Results and Discussion) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>V. RESULTS AND DISCUSSION</h2>

Write a 3-sentence overview.

Then write four subsections:

<h3>A. Experimental Results</h3>
Write at least ${Math.round(w.resultsDisc * 0.30)} words.
Present main quantitative/qualitative results. Include metrics, percentages, p-values, confidence intervals.

After this subsection, include:
<p class="table-caption">Table IV: Summary of Experimental Results</p>
<table>
  <thead><tr><th>Metric</th><th>Proposed Method</th><th>Baseline / Existing</th><th>Improvement (%)</th><th>p-value</th></tr></thead>
  <tbody>(6–8 rows with realistic values for ${topic})</tbody>
</table>

Then reproduce this SVG bar chart (BLUE/STEEL theme) comparing methods for ${topic}:
<div class="figure-container">
<svg viewBox="0 0 350 250" xmlns="http://www.w3.org/2000/svg">
  <rect width="350" height="250" fill="#E8EAF6" rx="4"/>
  <text x="175" y="15" text-anchor="middle" font-size="11" font-weight="bold" fill="#1A237E">Performance Comparison: ${topic}</text>
  <!-- Axes -->
  <line x1="55" y1="25" x2="55" y2="190" stroke="#283593" stroke-width="1.5"/>
  <line x1="55" y1="190" x2="340" y2="190" stroke="#283593" stroke-width="1.5"/>
  <!-- Gridlines -->
  <line x1="55" y1="70" x2="340" y2="70" stroke="#C5CAE9" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="110" x2="340" y2="110" stroke="#C5CAE9" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="150" x2="340" y2="150" stroke="#C5CAE9" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Y labels (REPLACE with actual values) -->
  <text x="50" y="73" text-anchor="end" font-size="9" fill="#283593">100</text>
  <text x="50" y="113" text-anchor="end" font-size="9" fill="#283593">75</text>
  <text x="50" y="153" text-anchor="end" font-size="9" fill="#283593">50</text>
  <text x="50" y="193" text-anchor="end" font-size="9" fill="#283593">0</text>
  <text x="28" y="115" text-anchor="middle" font-size="9" fill="#1A237E" transform="rotate(-90,28,115)">Score</text>
  <!-- Bars (REPLACE method names, fill colors, heights, and value labels with real data for ${topic}) -->
  <rect x="72" y="40" width="38" height="150" fill="#3949AB"/>
  <text x="91" y="36" text-anchor="middle" font-size="9" fill="#1A237E" font-weight="bold">94</text>
  <text x="91" y="205" text-anchor="middle" font-size="8" fill="#1A237E">Proposed</text>
  <rect x="137" y="75" width="38" height="115" fill="#5C6BC0"/>
  <text x="156" y="71" text-anchor="middle" font-size="9" fill="#1A237E" font-weight="bold">78</text>
  <text x="156" y="205" text-anchor="middle" font-size="8" fill="#1A237E">Method A</text>
  <rect x="202" y="95" width="38" height="95" fill="#7986CB"/>
  <text x="221" y="91" text-anchor="middle" font-size="9" fill="#1A237E" font-weight="bold">68</text>
  <text x="221" y="205" text-anchor="middle" font-size="8" fill="#1A237E">Method B</text>
  <rect x="267" y="115" width="38" height="75" fill="#9FA8DA"/>
  <text x="286" y="111" text-anchor="middle" font-size="9" fill="#1A237E" font-weight="bold">55</text>
  <text x="286" y="205" text-anchor="middle" font-size="8" fill="#1A237E">Baseline</text>
  <!-- Legend -->
  <text x="175" y="228" text-anchor="middle" font-size="9" fill="#1A237E">Darker blue = higher performance rank for ${topic}</text>
</svg>
<p class="fig-caption">Fig. 4. Comparative performance across methods for ${topic}</p>
</div>

Also reproduce this SVG donut/pie chart (WARM RAINBOW theme) showing result distribution for ${topic}:
<div class="figure-container">
<svg viewBox="0 0 350 230" xmlns="http://www.w3.org/2000/svg">
  <rect width="350" height="230" fill="#FFFDE7" rx="4"/>
  <text x="175" y="15" text-anchor="middle" font-size="11" font-weight="bold" fill="#E65100">Result Distribution: ${topic}</text>
  <!-- Donut chart using stroke-dasharray on a circle (circumference ≈ 282 for r=45) -->
  <!-- Segment 1: ~35% (dasharray 99 183) REPLACE percentages with actual result categories -->
  <circle cx="130" cy="118" r="45" fill="none" stroke="#F44336" stroke-width="28"
    stroke-dasharray="99 183" stroke-dashoffset="0"/>
  <!-- Segment 2: ~28% (dasharray 79 203) -->
  <circle cx="130" cy="118" r="45" fill="none" stroke="#FF9800" stroke-width="28"
    stroke-dasharray="79 203" stroke-dashoffset="-99"/>
  <!-- Segment 3: ~22% (dasharray 62 220) -->
  <circle cx="130" cy="118" r="45" fill="none" stroke="#4CAF50" stroke-width="28"
    stroke-dasharray="62 220" stroke-dashoffset="-178"/>
  <!-- Segment 4: remaining ~15% -->
  <circle cx="130" cy="118" r="45" fill="none" stroke="#2196F3" stroke-width="28"
    stroke-dasharray="42 240" stroke-dashoffset="-240"/>
  <!-- Center hole -->
  <circle cx="130" cy="118" r="28" fill="#FFFDE7"/>
  <text x="130" y="114" text-anchor="middle" font-size="10" fill="#E65100" font-weight="bold">Result</text>
  <text x="130" y="126" text-anchor="middle" font-size="10" fill="#E65100" font-weight="bold">Split</text>
  <!-- Legend (REPLACE category names with actual result categories for ${topic}) -->
  <rect x="215" y="65" width="12" height="12" fill="#F44336" rx="2"/>
  <text x="231" y="76" font-size="10" fill="#333">Category A: 35%</text>
  <rect x="215" y="87" width="12" height="12" fill="#FF9800" rx="2"/>
  <text x="231" y="98" font-size="10" fill="#333">Category B: 28%</text>
  <rect x="215" y="109" width="12" height="12" fill="#4CAF50" rx="2"/>
  <text x="231" y="120" font-size="10" fill="#333">Category C: 22%</text>
  <rect x="215" y="131" width="12" height="12" fill="#2196F3" rx="2"/>
  <text x="231" y="142" font-size="10" fill="#333">Category D: 15%</text>
  <!-- NOTE: Adjust stroke-dasharray values and labels to reflect actual ${topic} data -->
</svg>
<p class="fig-caption">Fig. 5. Distribution of ${topic} results by category</p>
</div>

<h3>B. Analysis and Interpretation</h3>
Write at least ${Math.round(w.resultsDisc * 0.25)} words.
Explain WHY results occurred. Discuss underlying causes, mechanisms, contributing factors. Address any unexpected findings.

Include a line graph showing performance trends (DARK RED/NAVY theme):
<div class="figure-container">
<svg viewBox="0 0 350 230" xmlns="http://www.w3.org/2000/svg">
  <rect width="350" height="230" fill="#FFEBEE" rx="4"/>
  <text x="175" y="15" text-anchor="middle" font-size="11" font-weight="bold" fill="#B71C1C">Performance Trend Analysis: ${topic}</text>
  <!-- Axes -->
  <line x1="55" y1="25" x2="55" y2="185" stroke="#C62828" stroke-width="1.5"/>
  <line x1="55" y1="185" x2="330" y2="185" stroke="#C62828" stroke-width="1.5"/>
  <!-- Gridlines -->
  <line x1="55" y1="65" x2="330" y2="65" stroke="#FFCDD2" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="105" x2="330" y2="105" stroke="#FFCDD2" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="145" x2="330" y2="145" stroke="#FFCDD2" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Y labels (REPLACE with actual metric range for ${topic}) -->
  <text x="50" y="68" text-anchor="end" font-size="9" fill="#C62828">100%</text>
  <text x="50" y="108" text-anchor="end" font-size="9" fill="#C62828">75%</text>
  <text x="50" y="148" text-anchor="end" font-size="9" fill="#C62828">50%</text>
  <text x="50" y="188" text-anchor="end" font-size="9" fill="#C62828">25%</text>
  <text x="28" y="110" text-anchor="middle" font-size="9" fill="#B71C1C" transform="rotate(-90,28,110)">Accuracy (%)</text>
  <!-- X labels (REPLACE with actual iterations/epochs/folds for ${topic}) -->
  <text x="80" y="200" text-anchor="middle" font-size="9" fill="#B71C1C">Ep.1</text>
  <text x="120" y="200" text-anchor="middle" font-size="9" fill="#B71C1C">Ep.5</text>
  <text x="160" y="200" text-anchor="middle" font-size="9" fill="#B71C1C">Ep.10</text>
  <text x="200" y="200" text-anchor="middle" font-size="9" fill="#B71C1C">Ep.20</text>
  <text x="240" y="200" text-anchor="middle" font-size="9" fill="#B71C1C">Ep.30</text>
  <text x="280" y="200" text-anchor="middle" font-size="9" fill="#B71C1C">Ep.40</text>
  <text x="320" y="200" text-anchor="middle" font-size="9" fill="#B71C1C">Ep.50</text>
  <!-- Proposed method line (REPLACE y-coords to reflect actual convergence curve) -->
  <polyline points="80,155 120,130 160,105 200,80 240,68 280,60 320,55" fill="none" stroke="#B71C1C" stroke-width="2.5"/>
  <circle cx="80" cy="155" r="4" fill="#B71C1C"/><circle cx="120" cy="130" r="4" fill="#B71C1C"/>
  <circle cx="160" cy="105" r="4" fill="#B71C1C"/><circle cx="200" cy="80" r="4" fill="#B71C1C"/>
  <circle cx="240" cy="68" r="4" fill="#B71C1C"/><circle cx="280" cy="60" r="4" fill="#B71C1C"/>
  <circle cx="320" cy="55" r="4" fill="#7B0000"/>
  <!-- Baseline line -->
  <polyline points="80,165 120,155 160,140 200,125 240,118 280,112 320,108" fill="none" stroke="#0D47A1" stroke-width="2" stroke-dasharray="6,3"/>
  <circle cx="80" cy="165" r="3" fill="#0D47A1"/><circle cx="320" cy="108" r="3" fill="#0D47A1"/>
  <!-- Legend -->
  <line x1="65" y1="215" x2="90" y2="215" stroke="#B71C1C" stroke-width="2.5"/>
  <text x="93" y="219" font-size="9" fill="#B71C1C">Proposed</text>
  <line x1="190" y1="215" x2="215" y2="215" stroke="#0D47A1" stroke-width="2" stroke-dasharray="6,3"/>
  <text x="218" y="219" font-size="9" fill="#0D47A1">Baseline</text>
</svg>
<p class="fig-caption">Fig. 6. Performance trend of proposed vs baseline for ${topic}</p>
</div>

<h3>C. Comparison with Existing Literature</h3>
Write at least ${Math.round(w.resultsDisc * 0.25)} words.
Compare findings with at least 8 prior studies. For each: agree/disagree/extend. Use ${citationStyle} citations.

<h3>D. Implications and Limitations</h3>
Write at least ${Math.round(w.resultsDisc * 0.20)} words.
(1) Theoretical implications for ${domain}.
(2) Practical recommendations for professionals.
(3) Limitations of this study and how they affect generalizability.

Begin with <h2>V. RESULTS AND DISCUSSION</h2>.`,
      minWords: w.resultsDisc,
    },

    // ── SECTION 6: Conclusion ────────────────────────────────────────────
    {
      sectionName: 'Conclusion',
      systemMessage: `${baseSystem}\nWrite ONLY the Conclusion section. Target: minimum ${w.conclusion} words.`,
      userPrompt: `Write Section VI (Conclusion) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>VI. CONCLUSION</h2>

Write at least 5 substantial paragraphs in <p style="text-align:justify"> tags. No bullet lists.

P1: Restate the research problem and gap addressed in this paper.
P2: Summarize the proposed system/method and how it differs from existing systems.
P3: State the principal findings and quantitative results achieved.
P4: Articulate specific contributions to ${domain}. Acknowledge study limitations.
P5: Propose 3+ concrete future research directions with justification.

Minimum ${w.conclusion} words.

Begin with <h2>VI. CONCLUSION</h2>.`,
      minWords: w.conclusion,
    },

    // ── SECTION 7: References ────────────────────────────────────────────
    {
      sectionName: 'References',
      systemMessage: `${baseSystem}\nWrite ONLY the References section. Output ${refCount} IEEE-format references.`,
      userPrompt: `Write Section VII (References) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>VII. REFERENCES</h2>

List exactly ${refCount} references in IEEE format. Each reference on its own line wrapped in <p style="text-align:justify"> tags.
Format: <p style="text-align:justify">[N] A. B. Surname, C. D. Author, "Title of the Paper," <em>Journal Name</em>, vol. XX, no. Y, pp. ZZZ–ZZZ, Mon. YYYY, doi: 10.XXXX/XXXXX.</p>

Requirements:
- Every reference must be relevant to ${topic} in ${domain}.
- Include a mix of journal articles, conference papers, and book chapters.
- References should span from foundational works (2015–2018) to recent publications (2022–2025).
- Use realistic author names, journal titles, and formatting.
- Number references sequentially from [1] to [${refCount.split('-')[1] || refCount.split('-')[0]}].

Begin with <h2>VII. REFERENCES</h2>.`,
      minWords: 200,
    },
  ]
}

// ════════════════════════════════════════════════════════════════════════════
// THEORETICAL paper sections (humanities, ethics, law, philosophy, policy)
// ════════════════════════════════════════════════════════════════════════════
function buildTheoreticalSections(ctx: SectionBuildContext): SectionPrompt[] {
  const { topic, domain, citationStyle, authorBlock, refCount, baseSystem } = ctx
  // Theoretical papers have their own budget split
  const totalWords = Object.values(ctx.w).reduce((a, b) => a + b, 0)
  const w = {
    intro:      Math.round(totalWords * 0.12),
    litRev:     Math.round(totalWords * 0.16),
    framework:  Math.round(totalWords * 0.20),
    analysis:   Math.round(totalWords * 0.22),
    discussion: Math.round(totalWords * 0.16),
    conclusion: Math.round(totalWords * 0.14),
  }
  return [
    // Section 1: Front Matter + Introduction (same structure)
    {
      sectionName: 'Front Matter & Introduction',
      systemMessage: `${baseSystem}\nWrite ONLY the front matter and introduction of the paper. Target: minimum ${w.intro + 400} words.`,
      userPrompt: `Write the front matter and introduction section for an IEEE academic paper on the following topic:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

You must produce the following HTML elements IN ORDER:

1. The paper title as: <h1>${topic}</h1>
2. The author block exactly as:
${authorBlock}
3. Abstract section:
<h2>Abstract</h2>
Write a single paragraph of at least 250 words inside <p style="text-align:justify"><em>...</em></p>.
Start with <strong>Abstract—</strong> inside the em tag.
Cover: context, the specific issue in ${domain}, objectives, analytical approach, key arguments, and significance.

4. Keywords: <p class="keywords"><strong>Keywords—</strong> 8–10 keywords for ${topic}</p>

5. Introduction:
<h2>I. INTRODUCTION</h2>
Write at least 6 paragraphs (${w.intro} words min):
Paragraph 1: Broad context of ${topic} in ${domain}.
Paragraph 2: The central question, problem, or debate.
Paragraph 3: Why existing scholarship is insufficient.
Paragraph 4: The specific gap this paper addresses.
Paragraph 5: Objectives, thesis statement, and analytical approach.
Paragraph 6: Structure of the paper (Section II covers…, etc.).

Begin with <h1>.`,
      minWords: w.intro + 400,
    },

    // Section 2: Background & Context
    {
      sectionName: 'Background & Context',
      systemMessage: `${baseSystem}\nWrite ONLY the Background & Context section. Target: minimum ${w.litRev} words.`,
      userPrompt: `Write Section II (Background and Context) for an academic paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>II. BACKGROUND AND CONTEXT</h2>

Then write three subsections:

<h3>A. Historical Development and Key Concepts</h3>
Write at least ${Math.round(w.litRev * 0.35)} words.
Trace the historical evolution of ${topic}. Define key concepts, terms, and theoretical constructs. Reference foundational thinkers and seminal works (use [Author et al., Year] placeholders).

<h3>B. Current Scholarly Discourse</h3>
Write at least ${Math.round(w.litRev * 0.35)} words.
Survey the current state of scholarship. Identify the major schools of thought, competing perspectives, and areas of consensus/disagreement. Use ${citationStyle} citations throughout.

After this subsection, include:
<p class="table-caption">Table I: Key Perspectives in the Literature</p>
<table>
  <thead><tr><th>Perspective/School</th><th>Key Proponents</th><th>Central Argument</th><th>Strengths</th><th>Limitations</th></tr></thead>
  <tbody>(Write 5–7 rows)</tbody>
</table>

<h3>C. Gaps and Open Questions</h3>
Write at least ${Math.round(w.litRev * 0.30)} words.
Identify at least 3 unresolved questions or gaps in the existing literature that this paper addresses.

Begin with <h2>II. BACKGROUND AND CONTEXT</h2>.`,
      minWords: w.litRev,
    },

    // Section 3: Analytical Framework
    {
      sectionName: 'Analytical Framework',
      systemMessage: `${baseSystem}\nWrite ONLY the Analytical Framework section. Target: minimum ${w.framework} words.`,
      userPrompt: `Write Section III (Analytical Framework) for an academic paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>III. ANALYTICAL FRAMEWORK</h2>

Write a 3-sentence overview of the analytical approach.

Then reproduce this SVG analytical framework diagram (TEAL-GREEN theme) adapted with real concepts for ${topic}:
<div class="figure-container">
<svg viewBox="0 0 350 290" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrTG" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#00695C"/>
    </marker>
  </defs>
  <rect width="350" height="290" fill="#E8F5E9" rx="4"/>
  <text x="175" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#1B5E20">Analytical Framework: ${topic}</text>
  <!-- Central research question box -->
  <rect x="90" y="22" width="170" height="34" rx="17" fill="#A5D6A7" stroke="#388E3C" stroke-width="2"/>
  <text x="175" y="43" text-anchor="middle" font-size="10" fill="#1B5E20" font-weight="bold">Research Question</text>
  <!-- Arrows from research question to three pillars -->
  <line x1="115" y1="56" x2="75" y2="92" stroke="#00695C" stroke-width="1.5" marker-end="url(#arrTG)"/>
  <line x1="175" y1="56" x2="175" y2="92" stroke="#00695C" stroke-width="1.5" marker-end="url(#arrTG)"/>
  <line x1="235" y1="56" x2="275" y2="92" stroke="#00695C" stroke-width="1.5" marker-end="url(#arrTG)"/>
  <!-- Pillar 1 (REPLACE labels with actual framework components for ${topic}) -->
  <rect x="22" y="92" width="106" height="34" rx="5" fill="#C8E6C9" stroke="#388E3C" stroke-width="1.5"/>
  <text x="75" y="113" text-anchor="middle" font-size="10" fill="#1B5E20" font-weight="bold">Theoretical Lens</text>
  <!-- Pillar 2 -->
  <rect x="118" y="92" width="114" height="34" rx="5" fill="#C8E6C9" stroke="#388E3C" stroke-width="1.5"/>
  <text x="175" y="113" text-anchor="middle" font-size="10" fill="#1B5E20" font-weight="bold">Methodology</text>
  <!-- Pillar 3 -->
  <rect x="224" y="92" width="106" height="34" rx="5" fill="#C8E6C9" stroke="#388E3C" stroke-width="1.5"/>
  <text x="277" y="113" text-anchor="middle" font-size="10" fill="#1B5E20" font-weight="bold">Evaluation Criteria</text>
  <!-- Arrows to analysis layer -->
  <line x1="75" y1="126" x2="115" y2="162" stroke="#00695C" stroke-width="1.5" marker-end="url(#arrTG)"/>
  <line x1="175" y1="126" x2="175" y2="162" stroke="#00695C" stroke-width="1.5" marker-end="url(#arrTG)"/>
  <line x1="277" y1="126" x2="237" y2="162" stroke="#00695C" stroke-width="1.5" marker-end="url(#arrTG)"/>
  <!-- Analysis layer -->
  <rect x="55" y="162" width="240" height="34" rx="5" fill="#66BB6A" stroke="#2E7D32" stroke-width="2"/>
  <text x="175" y="183" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold">Analysis &amp; Interpretation</text>
  <line x1="175" y1="196" x2="175" y2="222" stroke="#00695C" stroke-width="1.5" marker-end="url(#arrTG)"/>
  <!-- Findings -->
  <rect x="85" y="222" width="180" height="34" rx="5" fill="#A5D6A7" stroke="#388E3C" stroke-width="1.5"/>
  <text x="175" y="243" text-anchor="middle" font-size="10" fill="#1B5E20" font-weight="bold">Findings &amp; Insights</text>
  <line x1="175" y1="256" x2="175" y2="272" stroke="#00695C" stroke-width="1.5" marker-end="url(#arrTG)"/>
  <!-- Conclusion -->
  <rect x="115" y="272" width="120" height="14" rx="7" fill="#2E7D32"/>
  <text x="175" y="283" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold">Conclusions</text>
  <!-- NOTE: Replace ALL box labels with actual analytical concepts for ${topic} -->
</svg>
<p class="fig-caption">Fig. 1. Conceptual framework for analyzing ${topic}</p>
</div>

Then write three subsections:

<h3>A. Theoretical Foundations</h3>
Write at least ${Math.round(w.framework * 0.35)} words.
Describe the theoretical lens(es) used in this analysis. Justify why these theories are appropriate for ${topic}.

<h3>B. Analytical Approach and Criteria</h3>
Write at least ${Math.round(w.framework * 0.35)} words.
Detail the criteria, dimensions, or categories used for analysis. Explain how arguments are evaluated, what evidence counts, and the standards applied.

<h3>C. Scope, Limitations, and Ethical Considerations</h3>
Write at least ${Math.round(w.framework * 0.30)} words.
Define the boundaries of the analysis. Acknowledge limitations of the approach. Discuss ethical dimensions relevant to ${topic}.

Begin with <h2>III. ANALYTICAL FRAMEWORK</h2>.`,
      minWords: w.framework,
    },

    // Section 4: Analysis and Arguments
    {
      sectionName: 'Analysis and Arguments',
      systemMessage: `${baseSystem}\nWrite ONLY the Analysis section. Target: minimum ${w.analysis} words.`,
      userPrompt: `Write Section IV (Analysis and Arguments) for an academic paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>IV. ANALYSIS AND ARGUMENTS</h2>

Write a 3-sentence overview of the main arguments presented.

Then write three subsections:

<h3>A. Primary Analysis</h3>
Write at least ${Math.round(w.analysis * 0.40)} words.
Present the main analytical arguments. Examine the evidence, examples, case studies, or logical reasoning that supports each claim. Address counterarguments.

After this subsection, include:
<p class="table-caption">Table II: Comparative Analysis of Key Arguments</p>
<table>
  <thead><tr><th>Argument/Position</th><th>Supporting Evidence</th><th>Counterarguments</th><th>Assessment</th></tr></thead>
  <tbody>(Write 5–7 rows)</tbody>
</table>

<h3>B. Secondary Dimensions and Nuances</h3>
Write at least ${Math.round(w.analysis * 0.35)} words.
Explore additional dimensions, edge cases, or complicating factors. Show the complexity and nuance of ${topic}.

<h3>C. Synthesis of Arguments</h3>
Write at least ${Math.round(w.analysis * 0.25)} words.
Bring together the threads of analysis. What overall picture emerges? What is the paper's central contribution to understanding ${topic}?

Begin with <h2>IV. ANALYSIS AND ARGUMENTS</h2>.`,
      minWords: w.analysis,
    },

    // Section 5: Discussion and Implications
    {
      sectionName: 'Discussion & Implications',
      systemMessage: `${baseSystem}\nWrite ONLY the Discussion section. Target: minimum ${w.discussion} words.`,
      userPrompt: `Write Section V (Discussion and Implications) for an academic paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>V. DISCUSSION AND IMPLICATIONS</h2>

Write a 3-sentence opening summarizing the key insights from the analysis.

Then write three subsections:

<h3>A. Significance of the Findings</h3>
Write at least ${Math.round(w.discussion * 0.35)} words.
Explain what the analysis reveals about ${topic}. Why do these insights matter? How do they change or deepen our understanding?

<h3>B. Engagement with Existing Scholarship</h3>
Write at least ${Math.round(w.discussion * 0.35)} words.
Compare the paper's arguments with at least 6 existing works. Show where this paper agrees, disagrees, or extends prior scholarship. Use ${citationStyle} citations.

<h3>C. Practical, Theoretical, and Policy Implications</h3>
Write at least ${Math.round(w.discussion * 0.30)} words.
(1) Theoretical: how the analysis advances theory in ${domain}.
(2) Practical: actionable recommendations for practitioners or stakeholders.
(3) Policy: recommendations for policymakers or institutions, if applicable.

Begin with <h2>V. DISCUSSION AND IMPLICATIONS</h2>.`,
      minWords: w.discussion,
    },

    // Section 6: Conclusion
    {
      sectionName: 'Conclusion',
      systemMessage: `${baseSystem}\nWrite ONLY the Conclusion section. Target: minimum ${w.conclusion} words.`,
      userPrompt: `Write Section VI (Conclusion) for an academic paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>VI. CONCLUSION</h2>

Write at least 5 paragraphs in <p style="text-align:justify"> tags:
1. Restate the central question and why it matters.
2. Summarize the analytical approach used.
3. State the principal arguments and insights.
4. Articulate contributions to ${domain}. Note limitations.
5. Propose at least 3 future research directions.

Minimum ${w.conclusion} words.

Begin with <h2>VI. CONCLUSION</h2>.`,
      minWords: w.conclusion,
    },

    // Section 7: References
    {
      sectionName: 'References',
      systemMessage: `${baseSystem}\nWrite ONLY the References section. Output ${refCount} IEEE-format references.`,
      userPrompt: `Write the References section for an academic paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>REFERENCES</h2>

List exactly ${refCount} references in IEEE format. Each in <p style="text-align:justify"> tags.
Format: <p style="text-align:justify">[N] A. B. Surname, C. D. Author, "Title," <em>Journal</em>, vol. XX, no. Y, pp. ZZZ–ZZZ, Year, doi: 10.XXXX/XXXXX.</p>

All references must be relevant to ${topic} in ${domain}. Include journal articles, conference papers, and book chapters spanning 2015–2025.

Begin with <h2>REFERENCES</h2>.`,
      minWords: 200,
    },
  ]
}

// ════════════════════════════════════════════════════════════════════════════
// REVIEW paper sections (survey, meta-analysis, comparative study)
// ════════════════════════════════════════════════════════════════════════════
function buildReviewSections(ctx: SectionBuildContext): SectionPrompt[] {
  const { topic, domain, citationStyle, authorBlock, refCount, baseSystem } = ctx
  // Review papers have their own budget split
  const totalWords = Object.values(ctx.w).reduce((a, b) => a + b, 0)
  const w = {
    intro:       Math.round(totalWords * 0.12),
    litRev:      Math.round(totalWords * 0.16),
    review:      Math.round(totalWords * 0.22),
    comparative: Math.round(totalWords * 0.20),
    discussion:  Math.round(totalWords * 0.16),
    conclusion:  Math.round(totalWords * 0.14),
  }
  return [
    // Section 1: Front Matter + Introduction
    {
      sectionName: 'Front Matter & Introduction',
      systemMessage: `${baseSystem}\nWrite ONLY the front matter and introduction. Target: minimum ${w.intro + 400} words.`,
      userPrompt: `Write the front matter and introduction for an IEEE academic review/survey paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Produce IN ORDER:
1. <h1>${topic}</h1>
2. ${authorBlock}
3. <h2>Abstract</h2> — 250+ word paragraph covering: motivation for the review, scope, search methodology, key findings from the literature, and significance.
4. <p class="keywords"><strong>Keywords—</strong> 8–10 keywords</p>
5. <h2>I. INTRODUCTION</h2> — 6+ paragraphs (${w.intro} words min):
   - Why this review is needed
   - Scope and boundaries
   - Research questions guiding the review
   - How this review differs from existing surveys
   - Paper structure overview

Begin with <h1>.`,
      minWords: w.intro + 400,
    },

    // Section 2: Background
    {
      sectionName: 'Background',
      systemMessage: `${baseSystem}\nWrite ONLY the Background section. Target: minimum ${w.litRev} words.`,
      userPrompt: `Write Section II (Background) for a review paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>II. BACKGROUND</h2>

<h3>A. Key Concepts and Definitions</h3>
Write at least ${Math.round(w.litRev * 0.35)} words. Define all key terms, taxonomies, and conceptual models.

<h3>B. Evolution of the Field</h3>
Write at least ${Math.round(w.litRev * 0.35)} words. Trace how research on ${topic} has evolved over time. Identify major phases, turning points, and paradigm shifts.

<h3>C. Review Methodology</h3>
Write at least ${Math.round(w.litRev * 0.30)} words. Describe search strategy, databases used, inclusion/exclusion criteria, and the number of studies selected. Include:
<p class="table-caption">Table I: Review Methodology Summary</p>
<table>
  <thead><tr><th>Criterion</th><th>Description</th></tr></thead>
  <tbody>(Rows for: databases searched, search terms, date range, inclusion criteria, exclusion criteria, total studies screened, final studies included)</tbody>
</table>

Begin with <h2>II. BACKGROUND</h2>.`,
      minWords: w.litRev,
    },

    // Section 3: Systematic Review
    {
      sectionName: 'Systematic Review of Literature',
      systemMessage: `${baseSystem}\nWrite ONLY the Systematic Review section. Target: minimum ${w.review} words.`,
      userPrompt: `Write Section III (Systematic Review of Literature) for a review paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>III. SYSTEMATIC REVIEW OF LITERATURE</h2>

<h3>A. Thematic Category 1</h3>
Write at least ${Math.round(w.review * 0.35)} words. Group related studies by a major theme or approach. For each study describe: authors (placeholder), methodology, key findings, and limitations.

<h3>B. Thematic Category 2</h3>
Write at least ${Math.round(w.review * 0.35)} words. Second thematic grouping with the same detailed treatment.

<h3>C. Thematic Category 3</h3>
Write at least ${Math.round(w.review * 0.30)} words. Third thematic grouping.

Include a summary table after thematic categories:
<p class="table-caption">Table II: Summary of Reviewed Studies</p>
<table>
  <thead><tr><th>Study</th><th>Year</th><th>Method</th><th>Key Findings</th><th>Limitations</th></tr></thead>
  <tbody>(Write 8–12 rows covering studies from all 3 categories)</tbody>
</table>

Begin with <h2>III. SYSTEMATIC REVIEW OF LITERATURE</h2>.`,
      minWords: w.review,
    },

    // Section 4: Comparative Analysis
    {
      sectionName: 'Comparative Analysis',
      systemMessage: `${baseSystem}\nWrite ONLY the Comparative Analysis section. Target: minimum ${w.comparative} words.`,
      userPrompt: `Write Section IV (Comparative Analysis) for a review paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>IV. COMPARATIVE ANALYSIS</h2>

<h3>A. Cross-Study Comparisons</h3>
Write at least ${Math.round(w.comparative * 0.40)} words.
Compare the studies from Section III across dimensions: methodology, scale, findings, context. Identify areas of consensus and disagreement.

Include this comparison chart (CYAN/AMBER theme) adapted with real method names and scores from the reviewed studies:
<div class="figure-container">
<svg viewBox="0 0 350 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="350" height="260" fill="#E0F7FA" rx="4"/>
  <text x="175" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#006064">Comparative Overview of Approaches: ${topic}</text>
  <!-- Axes -->
  <line x1="55" y1="25" x2="55" y2="200" stroke="#00838F" stroke-width="1.5"/>
  <line x1="55" y1="200" x2="340" y2="200" stroke="#00838F" stroke-width="1.5"/>
  <!-- Gridlines -->
  <line x1="55" y1="60" x2="340" y2="60" stroke="#B2EBF2" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="95" x2="340" y2="95" stroke="#B2EBF2" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="130" x2="340" y2="130" stroke="#B2EBF2" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="55" y1="165" x2="340" y2="165" stroke="#B2EBF2" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Y labels -->
  <text x="50" y="63" text-anchor="end" font-size="9" fill="#00838F">100</text>
  <text x="50" y="98" text-anchor="end" font-size="9" fill="#00838F">75</text>
  <text x="50" y="133" text-anchor="end" font-size="9" fill="#00838F">50</text>
  <text x="50" y="168" text-anchor="end" font-size="9" fill="#00838F">25</text>
  <text x="50" y="203" text-anchor="end" font-size="9" fill="#00838F">0</text>
  <!-- Bars (REPLACE method names, heights, and value labels with actual reviewed approaches for ${topic}) -->
  <rect x="68" y="48" width="32" height="152" fill="#00ACC1"/>
  <text x="84" y="44" text-anchor="middle" font-size="9" fill="#006064" font-weight="bold">92</text>
  <text x="84" y="214" text-anchor="middle" font-size="8" fill="#006064">Method A</text>
  <rect x="118" y="65" width="32" height="135" fill="#26C6DA"/>
  <text x="134" y="61" text-anchor="middle" font-size="9" fill="#006064" font-weight="bold">84</text>
  <text x="134" y="214" text-anchor="middle" font-size="8" fill="#006064">Method B</text>
  <rect x="168" y="82" width="32" height="118" fill="#FFB300"/>
  <text x="184" y="78" text-anchor="middle" font-size="9" fill="#E65100" font-weight="bold">76</text>
  <text x="184" y="214" text-anchor="middle" font-size="8" fill="#006064">Method C</text>
  <rect x="218" y="100" width="32" height="100" fill="#FFA000"/>
  <text x="234" y="96" text-anchor="middle" font-size="9" fill="#E65100" font-weight="bold">68</text>
  <text x="234" y="214" text-anchor="middle" font-size="8" fill="#006064">Method D</text>
  <rect x="268" y="120" width="32" height="80" fill="#FF8F00"/>
  <text x="284" y="116" text-anchor="middle" font-size="9" fill="#E65100" font-weight="bold">58</text>
  <text x="284" y="214" text-anchor="middle" font-size="8" fill="#006064">Method E</text>
  <!-- Legend -->
  <rect x="75" y="237" width="10" height="10" fill="#00ACC1" rx="2"/>
  <text x="89" y="247" font-size="9" fill="#006064">Top performing</text>
  <rect x="195" y="237" width="10" height="10" fill="#FFB300" rx="2"/>
  <text x="209" y="247" font-size="9" fill="#E65100">Lower performing</text>
</svg>
<p class="fig-caption">Fig. 1. Comparative overview of reviewed approaches for ${topic}</p>
</div>

<h3>B. Trends and Patterns</h3>
Write at least ${Math.round(w.comparative * 0.30)} words.
Identify temporal trends, emerging methods, and shifting research focus areas.

<h3>C. Strengths and Weaknesses of Existing Research</h3>
Write at least ${Math.round(w.comparative * 0.30)} words.
Synthesize the collective strengths and weaknesses of the reviewed body of work.

Begin with <h2>IV. COMPARATIVE ANALYSIS</h2>.`,
      minWords: w.comparative,
    },

    // Section 5: Discussion and Research Agenda
    {
      sectionName: 'Discussion & Research Agenda',
      systemMessage: `${baseSystem}\nWrite ONLY the Discussion section. Target: minimum ${w.discussion} words.`,
      userPrompt: `Write Section V (Discussion and Research Agenda) for a review paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>V. DISCUSSION AND RESEARCH AGENDA</h2>

<h3>A. Key Insights from the Review</h3>
Write at least ${Math.round(w.discussion * 0.35)} words.
Summarize the most significant findings from the comparative analysis. What does the body of literature collectively reveal?

<h3>B. Research Gaps and Future Directions</h3>
Write at least ${Math.round(w.discussion * 0.35)} words.
Identify at least 5 specific research gaps. For each, explain why it matters and propose concrete research questions for future work.

<h3>C. Implications for Theory and Practice</h3>
Write at least ${Math.round(w.discussion * 0.30)} words.
Discuss what the review means for: (1) theory development, (2) practitioners, and (3) policymakers.

Begin with <h2>V. DISCUSSION AND RESEARCH AGENDA</h2>.`,
      minWords: w.discussion,
    },

    // Section 6: Conclusion
    {
      sectionName: 'Conclusion',
      systemMessage: `${baseSystem}\nWrite ONLY the Conclusion section. Target: minimum ${w.conclusion} words.`,
      userPrompt: `Write Section VI (Conclusion) for a review paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>VI. CONCLUSION</h2>

Write at least 5 paragraphs in <p style="text-align:justify"> tags:
1. Restate the purpose and scope of the review.
2. Summarize the review methodology.
3. State the key findings and patterns discovered.
4. Discuss contributions and limitations of this review.
5. Propose a concrete research agenda with 3+ future directions.

Minimum ${w.conclusion} words.

Begin with <h2>VI. CONCLUSION</h2>.`,
      minWords: w.conclusion,
    },

    // Section 7: References
    {
      sectionName: 'References',
      systemMessage: `${baseSystem}\nWrite ONLY the References section. Output ${refCount} IEEE-format references. Since this is a review paper, aim for the higher end.`,
      userPrompt: `Write the References section for a review paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>REFERENCES</h2>

List exactly ${refCount} references in IEEE format. Each in <p style="text-align:justify"> tags.
Format: <p style="text-align:justify">[N] A. B. Surname, C. D. Author, "Title," <em>Journal</em>, vol. XX, no. Y, pp. ZZZ–ZZZ, Year, doi: 10.XXXX/XXXXX.</p>

Since this is a review paper, include MORE references (aim for the higher end of ${refCount}). All references must be relevant to ${topic} in ${domain}.

Begin with <h2>REFERENCES</h2>.`,
      minWords: 200,
    },
  ]
}

// Legacy single-prompt builder (kept for backwards compatibility — now IEEE-format)
export function buildJournalPrompt(options: PaperOptions): string {
  const { topic, domain, citationStyle, wordCount, pageCount } = options
  const authorName = options.authorName || 'Author Name'
  const department = options.department || ''
  const college = options.college || ''
  const registerNumber = options.registerNumber || ''
  // 600 words per A4 page
  const targetWords = pageCount ? pageCount * 600 : wordCount

  // Per-section word budgets
  const introWords      = Math.round(targetWords * 0.12)
  const litRevWords     = Math.round(targetWords * 0.20)
  const litRevSub       = Math.round(litRevWords / 3)
  const methWords       = Math.round(targetWords * 0.15)
  const methSub         = Math.round(methWords / 3)
  const resultsWords    = Math.round(targetWords * 0.20)
  const discussWords    = Math.round(targetWords * 0.18)
  const discussSub      = Math.round(discussWords / 3)
  const conclusionWords = Math.round(targetWords * 0.08)
  const refCount        = targetWords > 3000 ? '20-30' : '8-12'

  const authorBlock = `<div class="author-block">
<p class="author-name">${authorName}</p>
${registerNumber ? `<p class="author-reg">${registerNumber}</p>` : ''}
${department ? `<p class="author-affiliation">${department}</p>` : ''}
${college ? `<p class="author-affiliation">${college}</p>` : ''}
</div>`

  return `You are an expert IEEE academic paper writer. Write a COMPLETE, LONG academic paper.

CRITICAL REQUIREMENT: The paper MUST contain AT LEAST ${targetWords} words. Do NOT stop early. Do NOT summarize. Write every section in full detail.

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}
MINIMUM TOTAL WORDS: ${targetWords}

OUTPUT RULES:
- Use ONLY HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <pre>, <div>, <svg>
- NO markdown, NO code fences, NO preamble — start directly with <h1>
- Every paragraph must be 120-200 words and use style="text-align:justify"
- Use IEEE section numbering: I, II, III, IV, V, VI (Roman numerals)
- Use IEEE subsection lettering: A, B, C
- Tables: use <table> with <thead>/<tbody>, label as "Table I", "Table II" (Roman numerals)
- Place table captions ABOVE tables using <p class="table-caption">Table I: Description</p>
- Figures: use inline <svg> with viewBox for charts, diagrams, and graphs. Wrap in <div class="figure-container"> with <p class="fig-caption">Fig. N. Description</p>
- Include at least 2-3 tables and 3-4 SVG figures (bar charts, pie charts, flowcharts) throughout the paper
- Use IEEE citation format: [1], [2], etc.
- Use formal academic English, third person

WRITE THE COMPLETE PAPER NOW:

<h1>${topic}</h1>

${authorBlock}

<h2>Abstract</h2>
<p style="text-align:justify"><em>[MINIMUM 250 words. Start with "Abstract—" in bold. Cover: background, problem, objective, methodology, findings, conclusions.]</em></p>

<p class="keywords"><strong>Keywords</strong>— [8-10 specific keywords]</p>

<h2>I. INTRODUCTION</h2>
<p style="text-align:justify">[MINIMUM ${introWords} words across 5+ paragraphs. Cover: context, problem, research gap, objectives, methodology brief, contributions, paper roadmap.]</p>

<h2>II. LITERATURE REVIEW</h2>

<h3>A. Theoretical Background and Foundations</h3>
<p style="text-align:justify">[MINIMUM ${litRevSub} words. Seminal works, theories, models for ${topic}.]</p>

Include: <p class="table-caption">Table I: Comparison of Related Works</p>
<table> with Author, Year, Method, Key Findings, Limitations columns (5+ rows)

<h3>B. Related Empirical Studies</h3>
<p style="text-align:justify">[MINIMUM ${litRevSub} words. 10+ empirical studies with ${citationStyle} citations.]</p>

<h3>C. Identified Research Gaps</h3>
<p style="text-align:justify">[MINIMUM ${litRevSub} words. 3+ specific gaps and how this paper fills them.]</p>

<h2>III. METHODOLOGY</h2>

Include a system architecture/methodology diagram:
<pre class="figure">[ASCII art with boxes and arrows]</pre>
<p class="fig-caption">Fig. 1. Proposed methodology for ${topic}</p>

<h3>A. Research Design</h3>
<p style="text-align:justify">[MINIMUM ${methSub} words.]</p>

<h3>B. Data Collection</h3>
<p style="text-align:justify">[MINIMUM ${methSub} words.]</p>

<h3>C. Analysis Techniques</h3>
<p style="text-align:justify">[MINIMUM ${methSub} words.]</p>

<h2>IV. RESULTS AND FINDINGS</h2>

Include: <p class="table-caption">Table II: Summary of Results</p>
<table> with results data (5+ rows)

Include: <pre class="figure">[ASCII bar chart comparing results]</pre>
<p class="fig-caption">Fig. 2. Performance comparison</p>

<h3>A. Primary Results</h3>
<p style="text-align:justify">[MINIMUM ${Math.round(resultsWords * 0.4)} words.]</p>

<h3>B. Secondary Findings</h3>
<p style="text-align:justify">[MINIMUM ${Math.round(resultsWords * 0.35)} words.]</p>

<h3>C. Summary of Results</h3>
<p style="text-align:justify">[MINIMUM ${Math.round(resultsWords * 0.25)} words.]</p>

<h2>V. DISCUSSION</h2>

<h3>A. Interpretation of Key Findings</h3>
<p style="text-align:justify">[MINIMUM ${discussSub} words.]</p>

<h3>B. Comparison with Prior Literature</h3>
<p style="text-align:justify">[MINIMUM ${discussSub} words. Compare with 8+ cited works.]</p>

<h3>C. Implications</h3>
<p style="text-align:justify">[MINIMUM ${discussSub} words. Theoretical, practical, policy implications.]</p>

<h2>VI. CONCLUSION</h2>
<p style="text-align:justify">[MINIMUM ${conclusionWords} words in prose. No bullet lists. Problem restatement, findings, contributions, limitations, future research.]</p>

<h2>REFERENCES</h2>
<p>[${refCount} IEEE-format references: [N] A. Author, "Title," <em>Journal</em>, vol. X, no. Y, pp. ZZ-ZZ, Year.]</p>

REMINDER: Write AT LEAST ${targetWords} words total. Do NOT truncate any section.`
}

export function buildAnalysisPrompt(content: string): string {
  // Strip HTML for analysis
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const wordCount = plainText.split(/\s+/).length

  return `You are an expert academic writing analyst. Analyze the following academic paper and provide a JSON assessment.

PAPER (${wordCount} words):
${plainText.slice(0, 8000)}

Respond with ONLY valid JSON (no markdown, no code fences, no explanation):
{
  "overallScore": <1-100>,
  "readability": {
    "score": <1-100>,
    "feedback": "<2-3 sentence assessment of readability>"
  },
  "academicTone": {
    "score": <1-100>,
    "feedback": "<2-3 sentence assessment of academic tone and formality>"
  },
  "structure": {
    "score": <1-100>,
    "feedback": "<2-3 sentence assessment of paper structure and organization>"
  },
  "grammar": {
    "score": <1-100>,
    "feedback": "<2-3 sentence assessment of grammar and language quality>"
  },
  "suggestions": [
    "<specific improvement suggestion 1>",
    "<specific improvement suggestion 2>",
    "<specific improvement suggestion 3>",
    "<specific improvement suggestion 4>",
    "<specific improvement suggestion 5>"
  ]
}`
}
