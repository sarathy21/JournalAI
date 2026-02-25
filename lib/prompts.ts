export interface PaperOptions {
  topic: string
  domain: string
  citationStyle: 'IEEE' | 'APA' | 'MLA'
  wordCount: number
  pageCount?: number
  authorName?: string
  department?: string
  college?: string
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
  const authorName = options.authorName || 'Author Name'
  const department = options.department || 'Department'
  const college = options.college || 'Institution'
  const registerNumber = options.registerNumber || ''

  // 600 words per A4 page
  const targetWords = pageCount ? pageCount * 600 : wordCount

  const w = {
    intro:      Math.round(targetWords * 0.14),
    litRev:     Math.round(targetWords * 0.20),
    method:     Math.round(targetWords * 0.17),
    results:    Math.round(targetWords * 0.20),
    discussion: Math.round(targetWords * 0.18),
    conclusion: Math.round(targetWords * 0.11),
  }

  const authorBlock = `<div class="author-block">
<p class="author-name">${authorName}</p>
${registerNumber ? `<p class="author-detail">${registerNumber}</p>` : ''}
<p class="author-detail">${department}</p>
<p class="author-detail">${college}</p>
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
8. ASCII diagrams: <pre class="figure">...</pre> then <p class="fig-caption">Fig. N. Caption</p>
9. Citations in IEEE style: [1], [2], [1]–[4]
10. Each paragraph must be 120–200 words of substantive academic content.
11. DO NOT stop early. Write the complete section until you reach the required word count.`

  const paperType = detectPaperType(topic, domain)

  // ─── Build sections based on paper type ────────────────────────────────
  if (paperType === 'theoretical') {
    return buildTheoreticalSections({ topic, domain, citationStyle, w, authorBlock, refCount, baseSystem })
  }
  if (paperType === 'review') {
    return buildReviewSections({ topic, domain, citationStyle, w, authorBlock, refCount, baseSystem })
  }
  // Default: empirical
  return buildEmpiricalSections({ topic, domain, citationStyle, w, authorBlock, refCount, baseSystem })
}

interface SectionBuildContext {
  topic: string; domain: string; citationStyle: string
  w: Record<string, number>; authorBlock: string; refCount: string; baseSystem: string
}

// ════════════════════════════════════════════════════════════════════════════
// EMPIRICAL paper sections (STEM, data-driven, experimental)
// ════════════════════════════════════════════════════════════════════════════
function buildEmpiricalSections(ctx: SectionBuildContext): SectionPrompt[] {
  const { topic, domain, citationStyle, w, authorBlock, refCount, baseSystem } = ctx
  return [
    // ── SECTION 1: Front Matter + Introduction ──────────────────────────
    {
      sectionName: 'Front Matter & Introduction',
      systemMessage: `${baseSystem}\nWrite ONLY the front matter and introduction of the paper. Target: minimum ${w.intro + 400} words.`,
      userPrompt: `Write the front matter and introduction section for an IEEE academic paper on the following topic:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

You must produce the following HTML elements IN ORDER. Write real content for each — do NOT write placeholder text:

1. The paper title as: <h1>${topic}</h1>

2. The author block exactly as:
${authorBlock}

3. Abstract section:
<h2>Abstract</h2>
Write a single paragraph of at least 250 words inside <p style="text-align:justify"><em>...</em></p>.
Start with <strong>Abstract—</strong> inside the em tag.
Cover: background context, the specific problem in ${domain} being addressed, the research objectives, the methodology used, the key findings, and the significance of the work. Be fully self-contained.

4. Keywords line:
<p class="keywords"><strong>Keywords—</strong> list 8 to 10 specific academic keywords relevant to ${topic}, separated by commas.</p>

5. Introduction section:
<h2>I. INTRODUCTION</h2>
Write at least 6 separate paragraphs, each wrapped in <p style="text-align:justify">...</p>, totalling at least ${w.intro} words.
Paragraph 1: Broad background of ${domain} and why ${topic} is important.
Paragraph 2: The specific problem or challenge being addressed and its real-world consequences.
Paragraph 3: Limitations of current approaches and methods in the literature.
Paragraph 4: The research gap that this paper addresses.
Paragraph 5: The specific objectives, research questions, and hypotheses.
Paragraph 6: Overview of the methodology and the paper's original contributions.
Paragraph 7: Roadmap of the paper sections (Section II covers..., Section III presents..., etc.).

Write all content as real academic prose now. Begin with <h1>.`,
      minWords: w.intro + 400,
    },

    // ── SECTION 2: Literature Review ────────────────────────────────────
    {
      sectionName: 'Literature Review',
      systemMessage: `${baseSystem}\nWrite ONLY the Literature Review section. Target: minimum ${w.litRev} words.`,
      userPrompt: `Write Section II (Literature Review) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin immediately with:
<h2>II. LITERATURE REVIEW</h2>

Then write a 2-sentence overview paragraph of the scope of this review.

Then write three subsections:

<h3>A. Theoretical Background and Foundations</h3>
Write at least ${Math.round(w.litRev * 0.30)} words in multiple paragraphs.
Discuss the foundational theories, models, and conceptual frameworks underlying ${topic}.
Name and describe at least 6 seminal works with author surnames, years, key contributions, and limitations. Use [1], [2] style citations throughout.

After this subsection, include a comparison table:
<p class="table-caption">Table I: Summary of Related Works</p>
<table>
  <thead><tr><th>Author(s)</th><th>Year</th><th>Approach</th><th>Key Findings</th><th>Limitations</th></tr></thead>
  <tbody>
  (Write 6 to 8 rows here with real data matching the works you discussed above)
  </tbody>
</table>

<h3>B. Recent Empirical Studies</h3>
Write at least ${Math.round(w.litRev * 0.40)} words in multiple paragraphs.
Review 8 to 12 empirical studies from the past 10 years related to ${topic}.
For each study: describe the methodology, dataset or sample, main findings, and limitations. Compare results across studies. Use ${citationStyle} in-text citations.

<h3>C. Research Gaps and Paper Positioning</h3>
Write at least ${Math.round(w.litRev * 0.30)} words.
Synthesize what the reviewed literature lacks. Identify at least 3 specific, concrete research gaps. For each gap, explain why it matters and how this paper addresses it. Describe this paper's novel contribution relative to the existing body of work.

Write all content as real academic prose now. Begin with <h2>II. LITERATURE REVIEW</h2>.`,
      minWords: w.litRev,
    },

    // ── SECTION 3: Methodology ───────────────────────────────────────────
    {
      sectionName: 'Methodology',
      systemMessage: `${baseSystem}\nWrite ONLY the Methodology section. Target: minimum ${w.method} words.`,
      userPrompt: `Write Section III (Methodology) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin immediately with:
<h2>III. METHODOLOGY</h2>

Write a 3-sentence overview paragraph describing the overall research approach and why it is appropriate for ${topic}.

Then include a system/methodology diagram using ASCII art:
<pre class="figure">
Draw a detailed ASCII flowchart or architecture diagram with at least 6 components connected by arrows.
Use box characters: +------+ for boxes and --> or ===> for arrows.
Make it specific to the methodology for ${topic}, not generic.
</pre>
<p class="fig-caption">Fig. 1. Proposed methodology framework for ${topic}</p>

Then write three subsections:

<h3>A. Research Design and Approach</h3>
Write at least ${Math.round(w.method * 0.30)} words.
Specify and justify the research design (experimental, quasi-experimental, observational, etc.).
Explain the philosophical paradigm (positivist, interpretivist, pragmatist).
Describe the overall study structure, timeline, and ethical considerations.

<h3>B. Data Collection and Materials</h3>
Write at least ${Math.round(w.method * 0.35)} words.
Describe in detail: the data sources or experimental setup, the population and sampling strategy, the sample size and how it was determined, instruments or datasets used (name them), the data collection procedure, and measures taken for validity and reliability.

<h3>C. Analysis Techniques and Implementation</h3>
Write at least ${Math.round(w.method * 0.35)} words.
Detail every analytical method, algorithm, or statistical test employed. Name specific tools, software versions, and libraries. Describe the validation techniques (cross-validation, hold-out sets, etc.) and how results were verified.

Write all content as real academic prose now. Begin with <h2>III. METHODOLOGY</h2>.`,
      minWords: w.method,
    },

    // ── SECTION 4: Results ───────────────────────────────────────────────
    {
      sectionName: 'Results and Findings',
      systemMessage: `${baseSystem}\nWrite ONLY the Results section. Target: minimum ${w.results} words.`,
      userPrompt: `Write Section IV (Results and Findings) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin immediately with:
<h2>IV. RESULTS AND FINDINGS</h2>

Write a 3-sentence overview paragraph summarizing what this section presents and the structure of the findings.

Then write three subsections:

<h3>A. Primary Results</h3>
Write at least ${Math.round(w.results * 0.38)} words.
Present the main quantitative or qualitative findings in detail. Include specific numerical values, percentages, statistical significance levels (p-values), confidence intervals, and comparisons. Describe what each result means in context.

After this subsection, include a results table:
<p class="table-caption">Table II: Summary of Principal Results</p>
<table>
  <thead><tr><th>Parameter / Metric</th><th>Proposed Method</th><th>Baseline</th><th>Improvement (%)</th><th>p-value</th></tr></thead>
  <tbody>
  (Write 6 to 8 rows of realistic quantitative results relevant to ${topic})
  </tbody>
</table>

Then include a performance comparison using ASCII bar chart:
<pre class="figure">
Performance Comparison (create an ASCII bar chart with at least 4 methods compared,
using | characters to draw bars proportional to their values, labels on left, percentages on right.
Make values realistic for ${topic} in ${domain}.)
</pre>
<p class="fig-caption">Fig. 2. Comparative performance of proposed method against baseline approaches</p>

<h3>B. Secondary and Supporting Findings</h3>
Write at least ${Math.round(w.results * 0.35)} words.
Present sub-group analyses, secondary metrics, sensitivity analyses, or additional experiments. Describe patterns, trends, and any unexpected results.

<h3>C. Summary of All Results</h3>
Write at least ${Math.round(w.results * 0.27)} words.
Provide a cohesive narrative that brings together all findings from subsections A and B. Highlight the most important results and their collective meaning for the research questions stated in the introduction.

Write all content as real academic prose now. Begin with <h2>IV. RESULTS AND FINDINGS</h2>.`,
      minWords: w.results,
    },

    // ── SECTION 5: Discussion ────────────────────────────────────────────
    {
      sectionName: 'Discussion',
      systemMessage: `${baseSystem}\nWrite ONLY the Discussion section. Target: minimum ${w.discussion} words.`,
      userPrompt: `Write Section V (Discussion) for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin immediately with:
<h2>V. DISCUSSION</h2>

Write a 3-sentence opening paragraph restating the research problem and providing a high-level interpretation of what the results mean.

Then write three subsections:

<h3>A. Interpretation of Key Findings</h3>
Write at least ${Math.round(w.discussion * 0.35)} words.
Explain WHY each major result occurred — not just what was found, but the underlying mechanisms, causal relationships, and contributing factors. Discuss any unexpected findings and propose explanations. Use evidence and logic, not just assertion.

<h3>B. Comparison with Existing Literature</h3>
Write at least ${Math.round(w.discussion * 0.35)} words.
Compare your findings systematically with at least 8 previously published studies on ${topic}. For each comparison: state whether findings agree, partially agree, or contradict prior work, and explain why the difference exists. Use ${citationStyle} citations throughout. Discuss how your work extends, confirms, or challenges existing knowledge.

<h3>C. Theoretical, Practical, and Policy Implications</h3>
Write at least ${Math.round(w.discussion * 0.30)} words.
Discuss three distinct types of implications:
(1) Theoretical: how the findings advance theory in ${domain}.
(2) Practical: specific actionable recommendations for practitioners, engineers, or organizations.
(3) Policy: recommendations for policymakers, standards bodies, or regulatory agencies.

Write all content as real academic prose now. Begin with <h2>V. DISCUSSION</h2>.`,
      minWords: w.discussion,
    },

    // ── SECTION 6: Conclusion + References ──────────────────────────────
    {
      sectionName: 'Conclusion & References',
      systemMessage: `${baseSystem}\nWrite ONLY the Conclusion and References sections. Target: minimum ${w.conclusion} words for conclusion plus ${refCount} references.`,
      userPrompt: `Write Section VI (Conclusion) and the References for an IEEE paper on:

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}

Begin immediately with:
<h2>VI. CONCLUSION</h2>

Write the conclusion as a minimum of 5 substantial paragraphs entirely in <p style="text-align:justify"> tags. Do NOT use bullet lists or headings inside the conclusion.

Paragraph 1: Restate the research problem, the research gap, and why it matters to ${domain}.
Paragraph 2: Summarize the methodology and what was done.
Paragraph 3: State the principal findings and what they demonstrate.
Paragraph 4: Articulate the specific contributions of this paper to knowledge in ${domain}. Note limitations of the study and how they affect generalizability.
Paragraph 5: Propose at least 3 concrete future research directions with justification for each.

Total conclusion length: minimum ${w.conclusion} words.

Then write:
<h2>REFERENCES</h2>
List ${refCount} references in IEEE numbered format. Each entry must be on its own line inside a single <p> tag.
Format: [N] A. B. Firstname Surname, C. D. Secondauthor, "Full title of the paper or book chapter," <em>Full Journal or Conference Name</em>, vol. XX, no. Y, pp. ZZZ–ZZZ, Mon. YYYY, doi: 10.XXXX/XXXXX.
Make all references topically relevant to ${topic} in ${domain}. Use realistic but fictional author names, journal names, and DOIs.

Write all content as real academic prose now. Begin with <h2>VI. CONCLUSION</h2>.`,
      minWords: w.conclusion,
    },
  ]
}

// ════════════════════════════════════════════════════════════════════════════
// THEORETICAL paper sections (humanities, ethics, law, philosophy, policy)
// ════════════════════════════════════════════════════════════════════════════
function buildTheoreticalSections(ctx: SectionBuildContext): SectionPrompt[] {
  const { topic, domain, citationStyle, w, authorBlock, refCount, baseSystem } = ctx
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
      systemMessage: `${baseSystem}\nWrite ONLY the Analytical Framework section. Target: minimum ${w.method} words.`,
      userPrompt: `Write Section III (Analytical Framework) for an academic paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>III. ANALYTICAL FRAMEWORK</h2>

Write a 3-sentence overview of the analytical approach.

Then include a conceptual diagram:
<pre class="figure">
Draw an ASCII diagram showing the analytical framework — key concepts, their relationships, and how they connect to the research questions. Use boxes and arrows.
</pre>
<p class="fig-caption">Fig. 1. Conceptual framework for analyzing ${topic}</p>

Then write three subsections:

<h3>A. Theoretical Foundations</h3>
Write at least ${Math.round(w.method * 0.35)} words.
Describe the theoretical lens(es) used in this analysis. Justify why these theories are appropriate for ${topic}.

<h3>B. Analytical Approach and Criteria</h3>
Write at least ${Math.round(w.method * 0.35)} words.
Detail the criteria, dimensions, or categories used for analysis. Explain how arguments are evaluated, what evidence counts, and the standards applied.

<h3>C. Scope, Limitations, and Ethical Considerations</h3>
Write at least ${Math.round(w.method * 0.30)} words.
Define the boundaries of the analysis. Acknowledge limitations of the approach. Discuss ethical dimensions relevant to ${topic}.

Begin with <h2>III. ANALYTICAL FRAMEWORK</h2>.`,
      minWords: w.method,
    },

    // Section 4: Analysis and Arguments
    {
      sectionName: 'Analysis and Arguments',
      systemMessage: `${baseSystem}\nWrite ONLY the Analysis section. Target: minimum ${w.results} words.`,
      userPrompt: `Write Section IV (Analysis and Arguments) for an academic paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>IV. ANALYSIS AND ARGUMENTS</h2>

Write a 3-sentence overview of the main arguments presented.

Then write three subsections:

<h3>A. Primary Analysis</h3>
Write at least ${Math.round(w.results * 0.40)} words.
Present the main analytical arguments. Examine the evidence, examples, case studies, or logical reasoning that supports each claim. Address counterarguments.

After this subsection, include:
<p class="table-caption">Table II: Comparative Analysis of Key Arguments</p>
<table>
  <thead><tr><th>Argument/Position</th><th>Supporting Evidence</th><th>Counterarguments</th><th>Assessment</th></tr></thead>
  <tbody>(Write 5–7 rows)</tbody>
</table>

<h3>B. Secondary Dimensions and Nuances</h3>
Write at least ${Math.round(w.results * 0.35)} words.
Explore additional dimensions, edge cases, or complicating factors. Show the complexity and nuance of ${topic}.

<h3>C. Synthesis of Arguments</h3>
Write at least ${Math.round(w.results * 0.25)} words.
Bring together the threads of analysis. What overall picture emerges? What is the paper's central contribution to understanding ${topic}?

Begin with <h2>IV. ANALYSIS AND ARGUMENTS</h2>.`,
      minWords: w.results,
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
  const { topic, domain, citationStyle, w, authorBlock, refCount, baseSystem } = ctx
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
      systemMessage: `${baseSystem}\nWrite ONLY the Systematic Review section. Target: minimum ${w.method} words.`,
      userPrompt: `Write Section III (Systematic Review of Literature) for a review paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>III. SYSTEMATIC REVIEW OF LITERATURE</h2>

<h3>A. Thematic Category 1</h3>
Write at least ${Math.round(w.method * 0.35)} words. Group related studies by a major theme or approach. For each study describe: authors (placeholder), methodology, key findings, and limitations.

<h3>B. Thematic Category 2</h3>
Write at least ${Math.round(w.method * 0.35)} words. Second thematic grouping with the same detailed treatment.

<h3>C. Thematic Category 3</h3>
Write at least ${Math.round(w.method * 0.30)} words. Third thematic grouping.

Include a summary table after thematic categories:
<p class="table-caption">Table II: Summary of Reviewed Studies</p>
<table>
  <thead><tr><th>Study</th><th>Year</th><th>Method</th><th>Key Findings</th><th>Limitations</th></tr></thead>
  <tbody>(Write 8–12 rows covering studies from all 3 categories)</tbody>
</table>

Begin with <h2>III. SYSTEMATIC REVIEW OF LITERATURE</h2>.`,
      minWords: w.method,
    },

    // Section 4: Comparative Analysis
    {
      sectionName: 'Comparative Analysis',
      systemMessage: `${baseSystem}\nWrite ONLY the Comparative Analysis section. Target: minimum ${w.results} words.`,
      userPrompt: `Write Section IV (Comparative Analysis) for a review paper on:

TOPIC: ${topic}
DOMAIN: ${domain}

Begin with: <h2>IV. COMPARATIVE ANALYSIS</h2>

<h3>A. Cross-Study Comparisons</h3>
Write at least ${Math.round(w.results * 0.40)} words.
Compare the studies from Section III across dimensions: methodology, scale, findings, context. Identify areas of consensus and disagreement.

Include a comparison chart:
<pre class="figure">
Create an ASCII chart comparing the key approaches or methods found in the reviewed studies. Show at least 5 dimensions of comparison.
</pre>
<p class="fig-caption">Fig. 1. Comparative overview of reviewed approaches</p>

<h3>B. Trends and Patterns</h3>
Write at least ${Math.round(w.results * 0.30)} words.
Identify temporal trends, emerging methods, and shifting research focus areas.

<h3>C. Strengths and Weaknesses of Existing Research</h3>
Write at least ${Math.round(w.results * 0.30)} words.
Synthesize the collective strengths and weaknesses of the reviewed body of work.

Begin with <h2>IV. COMPARATIVE ANALYSIS</h2>.`,
      minWords: w.results,
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
- Use ONLY HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <pre>, <div>
- NO markdown, NO code fences, NO preamble — start directly with <h1>
- Every paragraph must be 120-200 words and use style="text-align:justify"
- Use IEEE section numbering: I, II, III, IV, V, VI (Roman numerals)
- Use IEEE subsection lettering: A, B, C
- Tables: use <table> with <thead>/<tbody>, label as "Table I", "Table II" (Roman numerals)
- Place table captions ABOVE tables using <p class="table-caption">Table I: Description</p>
- Figures: use <pre class="figure"> for ASCII art diagrams, followed by <p class="fig-caption">Fig. 1. Description</p>
- Include at least 2-3 tables and 2 figures throughout the paper
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
