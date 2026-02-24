export interface PaperOptions {
  topic: string
  domain: string
  citationStyle: 'IEEE' | 'APA' | 'MLA'
  wordCount: number
  pageCount?: number
}

export interface SectionPrompt {
  sectionName: string
  systemMessage: string
  userPrompt: string
  minWords: number
}

/**
 * Splits the paper into 6 focused section prompts so each Groq call
 * stays well within the model's practical ~6k-word output limit.
 */
export function buildSectionPrompts(options: PaperOptions): SectionPrompt[] {
  const { topic, domain, citationStyle, wordCount, pageCount } = options
  // 600 words per A4 page (12pt Times New Roman, double-spaced, 1-inch margins)
  const targetWords = pageCount ? pageCount * 600 : wordCount

  const w = {
    intro:      Math.round(targetWords * 0.13),
    litRev:     Math.round(targetWords * 0.20),
    method:     Math.round(targetWords * 0.16),
    results:    Math.round(targetWords * 0.20),
    discussion: Math.round(targetWords * 0.18),
    conclusion: Math.round(targetWords * 0.08),
    references: Math.round(targetWords * 0.05),
  }

  const ctx = `PAPER TOPIC: ${topic}\nDOMAIN: ${domain}\nCITATION STYLE: ${citationStyle}\nTOTAL TARGET: ${targetWords} words`
  const htmlRule = `OUTPUT: Pure HTML only — <h1>,<h2>,<h3>,<p>,<ul>,<ol>,<li>,<strong>,<em>. No markdown, no code fences, no commentary.`
  const refCount = targetWords > 5000 ? '25-35' : '10-15'

  return [
    {
      sectionName: 'Front Matter & Introduction',
      systemMessage: `You are an expert academic writer. Write ONLY the requested section. Every paragraph must be 120-200 words. Be thorough and verbose — do NOT summarize. Reach the minimum word count.`,
      userPrompt: `${ctx}\n${htmlRule}\n\nWrite ONLY these parts of the paper (MINIMUM ${w.intro + 300} words total):\n\n<h1>[Precise academic title for: ${topic}]</h1>\n\n<h2>Abstract</h2>\n<p>[MINIMUM 250 words. Cover: background and motivation, problem statement, objectives, methodology overview, key findings, conclusions, and significance. Fully self-contained.]</p>\n\n<h2>Keywords</h2>\n<p>[8-10 specific academic keywords separated by semicolons]</p>\n\n<h2>1. Introduction</h2>\n<p>[MINIMUM ${w.intro} words across at least 5 paragraphs. Must cover: (1) broad context of ${domain} and ${topic}, (2) the specific problem and its real-world consequences, (3) current limitations of existing approaches, (4) the research gap this paper addresses, (5) the specific objectives and research questions, (6) the methodology in brief, (7) the paper's contributions to knowledge, (8) a roadmap of sections. Each point needs its own detailed paragraph.]</p>`,
      minWords: w.intro + 300,
    },
    {
      sectionName: 'Literature Review',
      systemMessage: `You are an expert academic writer. Write ONLY the Literature Review section. Every paragraph must be 120-200 words. Be thorough — review each work in detail. Reach the minimum word count.`,
      userPrompt: `${ctx}\n${htmlRule}\n\nWrite ONLY the Literature Review section (MINIMUM ${w.litRev} words total):\n\n<h2>2. Literature Review</h2>\n<p>[Overview paragraph introducing the scope and organization of the review]</p>\n\n<h3>2.1 Theoretical Background and Foundations</h3>\n<p>[MINIMUM ${Math.round(w.litRev * 0.33)} words. Discuss foundational theories, models, and frameworks for ${topic}. Cover seminal works and how they shaped the field. Include author names, years, key contributions, and limitations for at least 5 works.]</p>\n\n<h3>2.2 Related Empirical Studies</h3>\n<p>[MINIMUM ${Math.round(w.litRev * 0.40)} words. Review at least 10 empirical studies from the last 10 years. For each: describe the methodology, sample, findings, and limitations. Identify patterns and contradictions across studies. Use ${citationStyle} in-text citations.]</p>\n\n<h3>2.3 Identified Research Gaps and Positioning</h3>\n<p>[MINIMUM ${Math.round(w.litRev * 0.27)} words. Synthesize what the literature lacks. Identify at least 3 specific gaps. Explain how this paper fills each gap and what novel contribution it makes.]</p>`,
      minWords: w.litRev,
    },
    {
      sectionName: 'Methodology',
      systemMessage: `You are an expert academic writer. Write ONLY the Methodology section. Every paragraph must be 120-200 words. Be thorough and detailed. Reach the minimum word count.`,
      userPrompt: `${ctx}\n${htmlRule}\n\nWrite ONLY the Methodology section (MINIMUM ${w.method} words total):\n\n<h2>3. Methodology</h2>\n<p>[Overview paragraph of the overall research approach and rationale]</p>\n\n<h3>3.1 Research Design and Philosophical Approach</h3>\n<p>[MINIMUM ${Math.round(w.method * 0.30)} words. Specify and justify the research paradigm (positivist/interpretivist/pragmatist). Explain the study design (experimental/observational/computational/survey/etc.) and why it is most appropriate for ${topic}. Discuss ethical considerations.]</p>\n\n<h3>3.2 Data Collection and Materials</h3>\n<p>[MINIMUM ${Math.round(w.method * 0.35)} words. Describe data sources in detail: population, sampling strategy and size justification, instruments or datasets used, data collection procedure, validity and reliability measures, and potential biases.]</p>\n\n<h3>3.3 Analysis Techniques and Implementation</h3>\n<p>[MINIMUM ${Math.round(w.method * 0.35)} words. Detail every analytical method, algorithm, or statistical test used. Name specific software and versions. Explain parameter selection. Describe validation techniques and how limitations of the analysis were mitigated.]</p>`,
      minWords: w.method,
    },
    {
      sectionName: 'Results',
      systemMessage: `You are an expert academic writer. Write ONLY the Results section. Every paragraph must be 120-200 words. Present all findings in full detail. Reach the minimum word count.`,
      userPrompt: `${ctx}\n${htmlRule}\n\nWrite ONLY the Results section (MINIMUM ${w.results} words total):\n\n<h2>4. Results and Findings</h2>\n<p>[Overview of the results structure and what was found at a high level]</p>\n\n<h3>4.1 Primary Results</h3>\n<p>[MINIMUM ${Math.round(w.results * 0.40)} words. Present the main quantitative or qualitative findings in detail. Include specific values, percentages, comparisons, effect sizes, confidence intervals, or frequencies. Describe what each finding means in context. Do NOT interpret here — just report.]</p>\n\n<h3>4.2 Secondary and Supporting Findings</h3>\n<p>[MINIMUM ${Math.round(w.results * 0.35)} words. Present secondary findings, sub-group results, unexpected outcomes, or patterns observed. Be specific with data.]</p>\n\n<h3>4.3 Summary of All Results</h3>\n<p>[MINIMUM ${Math.round(w.results * 0.25)} words. Cohesive narrative summarizing all key findings. Highlight which results are most significant and why.]</p>`,
      minWords: w.results,
    },
    {
      sectionName: 'Discussion',
      systemMessage: `You are an expert academic writer. Write ONLY the Discussion section. Every paragraph must be 120-200 words. Provide deep interpretation. Reach the minimum word count.`,
      userPrompt: `${ctx}\n${htmlRule}\n\nWrite ONLY the Discussion section (MINIMUM ${w.discussion} words total):\n\n<h2>5. Discussion</h2>\n<p>[Opening paragraph restating the research problem and summarizing what the results mean]</p>\n\n<h3>5.1 Interpretation of Key Findings</h3>\n<p>[MINIMUM ${Math.round(w.discussion * 0.35)} words. Explain WHY each major result occurred. Discuss mechanisms, causal relationships, or explanatory factors. Address any unexpected findings and offer reasoned explanations.]</p>\n\n<h3>5.2 Comparison with Existing Literature</h3>\n<p>[MINIMUM ${Math.round(w.discussion * 0.35)} words. Compare findings with at least 8 previously published studies. Where results agree, explain why. Where they contradict, explore why the discrepancy exists. Use ${citationStyle} citations throughout.]</p>\n\n<h3>5.3 Theoretical, Practical, and Policy Implications</h3>\n<p>[MINIMUM ${Math.round(w.discussion * 0.30)} words. Discuss what the findings mean for (a) theory in ${domain}, (b) practitioners and industry, (c) policymakers or standards bodies if applicable. Be specific and actionable.]</p>`,
      minWords: w.discussion,
    },
    {
      sectionName: 'Conclusion & References',
      systemMessage: `You are an expert academic writer. Write ONLY the Conclusion and References. Every paragraph must be 100-200 words. Do not use bullet points in the conclusion. Reach the minimum word count.`,
      userPrompt: `${ctx}\n${htmlRule}\n\nWrite ONLY the Conclusion and References (MINIMUM ${w.conclusion + 300} words total):\n\n<h2>6. Conclusion</h2>\n<p>[MINIMUM ${w.conclusion} words in full academic prose (no bullet lists). Cover: (1) restatement of the research problem and why it matters, (2) summary of the main findings and what they demonstrate, (3) the specific contributions this paper makes to knowledge in ${domain}, (4) limitations of the study and how they affect generalizability, (5) concrete recommendations for future research with justification for each. Write at least 4 paragraphs.]</p>\n\n<h2>References</h2>\n<p>[List ${refCount} realistic, complete references in ${citationStyle} format. Each must include: all author surnames and initials, year, full article title, journal name in <em>italics</em>, volume number, issue number, page range, and DOI. Make references topically relevant to ${topic} in ${domain}.]</p>`,
      minWords: w.conclusion + 300,
    },
  ]
}

// Legacy single-prompt builder (kept for backwards compatibility)
export function buildJournalPrompt(options: PaperOptions): string {
  const { topic, domain, citationStyle, wordCount, pageCount } = options
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

  return `You are an expert academic writer. Your task is to write a COMPLETE, LONG academic journal paper.

CRITICAL REQUIREMENT: The paper MUST contain AT LEAST ${targetWords} words of actual content (approximately ${pageCount || Math.ceil(targetWords / 600)} A4 pages). Do NOT stop early. Do NOT summarize. Write every section in full detail until you reach the word target.

TOPIC: ${topic}
DOMAIN: ${domain}
CITATION STYLE: ${citationStyle}
MINIMUM TOTAL WORDS: ${targetWords}

OUTPUT RULES:
- Use ONLY HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>
- NO markdown, NO code fences, NO preamble, NO "Here is the paper" — start directly with <h1>
- Every paragraph must be 120-200 words
- Use formal academic English, third person

WRITE THE COMPLETE PAPER NOW — follow each section's MINIMUM word count strictly:

<h1>[Create a precise academic title for: ${topic}]</h1>

<h2>Abstract</h2>
<p>[MINIMUM 250 words. Cover: background, problem, objective, methodology, key findings, conclusions, significance. Must be self-contained and comprehensive.]</p>

<h2>Keywords</h2>
<p>[8-10 highly specific academic keywords separated by semicolons]</p>

<h2>1. Introduction</h2>
<p>[MINIMUM ${introWords} words total across multiple paragraphs. Required content: (a) broad context and background of ${domain}, (b) the specific problem or challenge being addressed, (c) why this problem matters (economic, social, or scientific significance), (d) what is currently unknown or unsolved (research gap), (e) the specific objectives of this paper, (f) the research questions, (g) brief overview of the methodology, (h) a roadmap of the paper sections. Write at least 5 substantial paragraphs.]</p>

<h2>2. Literature Review</h2>
<p>[MINIMUM ${litRevWords} words total. Review at least 15 published studies. Organize by theme or chronology. Each discussion of a study must include author, year, methods, findings, and limitations.]</p>

<h3>2.1 Theoretical Background and Foundations</h3>
<p>[MINIMUM ${litRevSub} words. Discuss the foundational theories, models, and frameworks relevant to ${topic}. Cite key historical and seminal works.]</p>

<h3>2.2 Related Empirical Studies</h3>
<p>[MINIMUM ${litRevSub} words. Review at least 8-10 directly related empirical studies published in the last 10 years. Compare methodologies, findings, and contexts.]</p>

<h3>2.3 Identified Research Gaps</h3>
<p>[MINIMUM ${litRevSub} words. Clearly articulate what the existing literature has not addressed, why those gaps matter, and how this paper fills them.]</p>

<h2>3. Methodology</h2>
<p>[MINIMUM ${methWords} words total.]</p>

<h3>3.1 Research Design and Approach</h3>
<p>[MINIMUM ${methSub} words. Justify the chosen research paradigm (quantitative/qualitative/mixed). Explain the overall study design in detail.]</p>

<h3>3.2 Data Collection and Sampling</h3>
<p>[MINIMUM ${methSub} words. Describe data sources, population, sampling strategy, sample size and rationale, instruments or tools used, data validity and reliability.]</p>

<h3>3.3 Data Analysis Techniques</h3>
<p>[MINIMUM ${methSub} words. Detail all analytical methods, statistical tests, software used, and how results were validated. Address limitations of the methodology.]</p>

<h2>4. Results and Findings</h2>
<p>[MINIMUM ${resultsWords} words total. Present ALL results in comprehensive detail. Include numerical data, percentages, comparisons, and observations organized into subsections. Each finding must be described fully — do not just mention it, explain it thoroughly with context.]</p>

<h3>4.1 Primary Findings</h3>
<p>[MINIMUM ${Math.round(resultsWords * 0.4)} words. Describe the main results with specific data points.]</p>

<h3>4.2 Secondary Findings</h3>
<p>[MINIMUM ${Math.round(resultsWords * 0.35)} words. Supporting findings and patterns observed.]</p>

<h3>4.3 Summary of Results</h3>
<p>[MINIMUM ${Math.round(resultsWords * 0.25)} words. Synthesize all findings cohesively.]</p>

<h2>5. Discussion</h2>
<p>[MINIMUM ${discussWords} words total. Interpret every result in depth. Explain WHY findings occurred, not just WHAT was found.]</p>

<h3>5.1 Interpretation of Key Findings</h3>
<p>[MINIMUM ${discussSub} words. In-depth interpretation of the primary results, including possible explanations and mechanisms.]</p>

<h3>5.2 Comparison with Prior Literature</h3>
<p>[MINIMUM ${discussSub} words. Explicitly compare your findings with at least 8 previously cited works — where do results agree, contradict, or extend existing knowledge?]</p>

<h3>5.3 Theoretical and Practical Implications</h3>
<p>[MINIMUM ${discussSub} words. What do the findings mean for theory in ${domain}? What are the actionable practical implications for practitioners, policymakers, or engineers?]</p>

<h2>6. Conclusion</h2>
<p>[MINIMUM ${conclusionWords} words. (a) Restate the research problem and why it matters, (b) summarize the main findings and contributions, (c) state the limitations honestly, (d) recommend specific future research directions with justification. Do NOT use bullet points here — write in full academic prose.]</p>

<h2>References</h2>
<p>[List ${refCount} full references in ${citationStyle} format. Each reference must include: all author names, year, full article title, journal name (italicized using <em>), volume, issue, page range, and DOI. Make references realistic and relevant to ${topic}.]</p>

REMINDER: You MUST write AT LEAST ${targetWords} words. Do not stop or truncate any section. Write every section completely before moving to the next.`
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
