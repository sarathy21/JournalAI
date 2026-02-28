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

  // Build author lines for HTML
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
8. FIGURES & CHARTS — use inline SVG for visual elements (NOT ASCII art):
   - Wrap every figure in: <div class="figure-container">...<p class="fig-caption">Fig. N. Caption</p></div>
   - BAR CHARTS: Use <svg> with <rect> elements. Include axis labels, data labels, a legend, and gridlines.
   - PIE CHARTS: Use <svg> with <path> or <circle> elements using stroke-dasharray. Include percentage labels and a legend.
   - LINE GRAPHS: Use <svg> with <polyline> or <path> elements. Include axis labels and data point markers.
   - FLOWCHARTS / ARCHITECTURE DIAGRAMS: Use <svg> with <rect>, <text>, and <line> or <path> with marker-end arrows.
   - All SVG must use viewBox for responsive sizing. Use viewBox="0 0 350 250" for charts that will appear inside a single column.
   - Use readable font sizes (10-12px) inside SVG <text> elements.
   - Use distinct fill colors for each data series (e.g., #4285F4, #EA4335, #FBBC04, #34A853, #FF6D01, #46BDC6).
   - EVERY figure must have a descriptive <p class="fig-caption"> caption below it.
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

After this subsection, include a timeline / trend chart as an inline SVG:
<div class="figure-container">
<svg viewBox="0 0 350 220" xmlns="http://www.w3.org/2000/svg">
  Draw an SVG line graph showing research publication trends over time for ${topic}.
  X-axis: years (e.g. 2018–2025). Y-axis: number of publications or performance metric.
  Use <polyline> or <path> with data point markers (<circle>). Include axis labels and a legend.
  Use colors: #4285F4 line, #EA4335 for comparison line if applicable.
</svg>
<p class="fig-caption">Fig. 1. Research trends and publication growth in ${topic}</p>
</div>

<h3>C. Research Gaps</h3>
Write at least ${Math.round(w.litRev * 0.30)} words.
Identify 3+ specific gaps. For each, explain why it matters and how this paper fills it.

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

Then include an architecture/flow diagram of the existing system as an inline SVG:
<div class="figure-container">
<svg viewBox="0 0 350 280" xmlns="http://www.w3.org/2000/svg">
  Draw a detailed SVG flowchart of the existing system/approach with at least 5 components
  as rectangles connected by arrows (lines with arrowhead markers). Show the typical workflow, data flow, or architecture.
  Use fill colors like #E3F2FD, #FFF3E0, #E8F5E9 for boxes, #333 for text, and #666 for arrows.
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

Then include the proposed system architecture as an inline SVG:
<div class="figure-container">
<svg viewBox="0 0 350 320" xmlns="http://www.w3.org/2000/svg">
  Draw a detailed SVG diagram of the proposed system architecture/methodology with at least 8 components.
  Use rectangles with rounded corners, arrows connecting them, and clear text labels.
  Use fill colors like #E8EAF6, #E0F7FA, #FFF9C4, #F3E5F5 for modules.
  Show data flow, processing stages, and key modules specific to the proposed approach for ${topic}.
</svg>
<p class="fig-caption">Fig. 3. Architecture of the proposed system for ${topic}</p>
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
<svg viewBox="0 0 350 220" xmlns="http://www.w3.org/2000/svg">
  Draw a grouped SVG bar chart comparing existing vs proposed system across at least 4 metrics.
  Use pairs of bars (#EA4335 existing, #4285F4 proposed) with percentage labels on top, x-axis metric names, and a legend.
</svg>
<p class="fig-caption">Fig. 7. Quantitative comparison of existing vs proposed system</p>
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
  <tbody>(6–8 rows)</tbody>
</table>

<div class="figure-container">
<svg viewBox="0 0 350 250" xmlns="http://www.w3.org/2000/svg">
  Draw an SVG bar chart comparing at least 4 methods/metrics. Use colored <rect> bars (e.g., #4285F4 for proposed, #EA4335 for baseline).
  Include x-axis labels, y-axis labels with gridlines, percentage values on top of each bar, and a legend.
</svg>
<p class="fig-caption">Fig. 4. Comparative performance of proposed vs baseline approaches</p>
</div>

Also include a pie chart showing the distribution of results or error categories:
<div class="figure-container">
<svg viewBox="0 0 350 250" xmlns="http://www.w3.org/2000/svg">
  Draw an SVG pie chart with at least 4 segments using distinct colors (#4285F4, #EA4335, #FBBC04, #34A853).
  Include percentage labels on or near each segment and a legend on the right side.
</svg>
<p class="fig-caption">Fig. 5. Distribution of ${topic} results by category</p>
</div>

<h3>B. Analysis and Interpretation</h3>
Write at least ${Math.round(w.resultsDisc * 0.25)} words.
Explain WHY results occurred. Discuss underlying causes, mechanisms, contributing factors. Address any unexpected findings.

Include a line graph showing performance trends:
<div class="figure-container">
<svg viewBox="0 0 350 220" xmlns="http://www.w3.org/2000/svg">
  Draw an SVG line graph with at least 2 lines (proposed method vs baseline).
  X-axis: training epochs, iterations, or data size. Y-axis: performance metric.
  Use <polyline> with different colors (#4285F4 proposed, #EA4335 baseline).
  Include data point markers, axis labels, gridlines, and a legend.
</svg>
<p class="fig-caption">Fig. 6. Performance trend comparison of proposed and baseline methods</p>
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
    // ── SECTION 7: References ────────────────────────────────────────────
    {
      sectionName: 'Conclusion & References',
      systemMessage: `${baseSystem}\nWrite ONLY the Conclusion and References. Target: min ${w.conclusion} words for conclusion plus ${refCount} references.`,
      userPrompt: `Write Section VI (Conclusion) and Section VII (References) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>VI. CONCLUSION</h2>

Write at least 5 substantial paragraphs in <p style="text-align:justify"> tags. No bullet lists.

P1: Restate the research problem and gap.
P2: Summarize what was proposed and how it differs from existing systems.
P3: State principal findings and what they demonstrate.
P4: Articulate contributions to ${domain}. Note study limitations.
P5: Propose 3+ concrete future research directions with justification.

Minimum ${w.conclusion} words.

Then:
<h2>VII. REFERENCES</h2>
List ${refCount} references in IEEE format. Each on its own line in <p> tags.
Format: [N] A. B. Surname, C. D. Author, "Title," <em>Journal</em>, vol. XX, no. Y, pp. ZZZ–ZZZ, Mon. YYYY, doi: 10.XXXX/XXXXX.
Make all references relevant to ${topic} in ${domain}.

Begin with <h2>VI. CONCLUSION</h2>.`,
      minWords: w.conclusion,
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

Then include a conceptual diagram as inline SVG:
<div class="figure-container">
<svg viewBox="0 0 500 350" xmlns="http://www.w3.org/2000/svg">
  Draw an SVG diagram showing the analytical framework — key concepts as rounded rectangles,
  their relationships as labeled arrows, and how they connect to the research questions.
  Use soft fill colors (#E8EAF6, #FFF3E0, #E8F5E9) and clear text labels.
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

    // Section 6: Conclusion + References
    {
      sectionName: 'Conclusion & References',
      systemMessage: `${baseSystem}\nWrite ONLY the Conclusion and References. Target: min ${w.conclusion} words for conclusion plus ${refCount} references.`,
      userPrompt: `Write Section VI (Conclusion) and References for an academic paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>VI. CONCLUSION</h2>

Write at least 5 paragraphs in <p style="text-align:justify"> tags:
1. Restate the central question and why it matters.
2. Summarize the analytical approach used.
3. State the principal arguments and insights.
4. Articulate contributions to ${domain}. Note limitations.
5. Propose at least 3 future research directions.

Minimum ${w.conclusion} words.

Then: <h2>REFERENCES</h2>
List ${refCount} references in IEEE format.
Format: [N] A. Author, "Title," <em>Journal</em>, vol. XX, no. Y, pp. ZZZ–ZZZ, Year.
Make references relevant to ${topic} in ${domain}.

Begin with <h2>VI. CONCLUSION</h2>.`,
      minWords: w.conclusion,
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

Include a comparison chart as inline SVG:
<div class="figure-container">
<svg viewBox="0 0 500 320" xmlns="http://www.w3.org/2000/svg">
  Create an SVG bar or grouped bar chart comparing the key approaches or methods found in the reviewed studies.
  Show at least 5 dimensions of comparison. Use distinct colors for each approach, axis labels, and a legend.
</svg>
<p class="fig-caption">Fig. 1. Comparative overview of reviewed approaches</p>
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

    // Section 6: Conclusion + References
    {
      sectionName: 'Conclusion & References',
      systemMessage: `${baseSystem}\nWrite ONLY the Conclusion and References. Target: min ${w.conclusion} words for conclusion plus ${refCount} references.`,
      userPrompt: `Write Section VI (Conclusion) and References for a review paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin with: <h2>VI. CONCLUSION</h2>

Write at least 5 paragraphs in <p style="text-align:justify"> tags:
1. Restate the purpose and scope of the review.
2. Summarize the review methodology.
3. State the key findings and patterns discovered.
4. Discuss contributions and limitations of this review.
5. Propose a concrete research agenda with 3+ future directions.

Minimum ${w.conclusion} words.

Then: <h2>REFERENCES</h2>
List ${refCount} references in IEEE format. Since this is a review paper, include MORE references (aim for the higher end).

Begin with <h2>VI. CONCLUSION</h2>.`,
      minWords: w.conclusion,
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
${registerNumber ? `<p class="author-detail">${registerNumber}</p>` : ''}
${department ? `<p class="author-detail">${department}</p>` : ''}
${college ? `<p class="author-detail">${college}</p>` : ''}
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
