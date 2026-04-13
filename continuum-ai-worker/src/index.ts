interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
}

interface AnalyzeRequest {
  type: 'analyze' | 'chat' | 'insights';
  text?: string;
  question?: string;
  mode?: 'rule' | 'ai';
  healthProfile?: object;
  recentEntries?: any[];
  messages?: any[];
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── CORS helper ──────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errResponse(message: string, status = 500): Response {
  return json({ error: message }, status);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return errResponse('Method not allowed', 405);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return errResponse('ANTHROPIC_API_KEY secret not configured', 500);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const body: AnalyzeRequest = await request.json();

      if (path === '/analyze') return handleAnalyze(body, env);
      if (path === '/chat') return handleChat(body, env);
      if (path === '/insights') return handleInsights(body, env);
      if (path === '/consult') return handleConsultation(body, env);
      if (path === '/predict') return handlePrediction(body, env);

      return errResponse('Not found', 404);
    } catch (error: any) {
      console.error('Worker error:', error);
      return errResponse(error?.message ?? 'Internal server error');
    }
  },
};

// ─── /analyze — extract structured data from health text ─────────────────────

async function handleAnalyze(body: AnalyzeRequest, env: Env): Promise<Response> {
  const { text, healthProfile } = body;
  if (!text?.trim()) return errResponse('text is required', 400);

  const prompt = `You are a medical data extraction system.
Extract structured health information from the following text.
Return ONLY valid JSON, no markdown, no explanation.

Health text to analyze:
${text}

${healthProfile ? `Existing health profile context:\n${JSON.stringify(healthProfile, null, 2)}` : ''}

Return this exact JSON structure:
{
  "conditions": ["condition1"],
  "medications": [{"name": "med", "dosage": "500mg", "frequency": "twice daily"}],
  "symptoms": ["symptom1"],
  "labValues": {"Test Name": "value with unit"},
  "summary": "2-3 sentence plain English summary",
  "riskFlags": ["specific concern if any"],
  "suggestedTitle": "Short descriptive title for this entry"
}`;

  try {
    const raw = await callAnthropic(prompt, env, 800);
    const structured = parseJSON(raw);
    return json({ success: true, structured });
  } catch (err: any) {
    return errResponse(err?.message ?? 'Analysis failed');
  }
}

// ─── /chat — personalized health Q&A ─────────────────────────────────────────

async function handleChat(body: AnalyzeRequest, env: Env): Promise<Response> {
  const { question, healthProfile, recentEntries, messages: historyMessages } = body;
  if (!question?.trim()) return errResponse('question is required', 400);

  const systemPrompt = `You are a personal health intelligence assistant.
You have access to the user's complete health data.
You provide clear, accurate, personalized health information.
You ALWAYS include a disclaimer that you are not a doctor.
You ALWAYS recommend consulting a healthcare professional for serious concerns.
You cite specific values from the user's data when relevant.
You are warm, clear, and never alarmist.
${!healthProfile || Object.keys(healthProfile ?? {}).length === 0 ? "The user hasn't added any health data yet. Acknowledge this warmly and encourage them to upload a report or describe their symptoms." : ''}

User's health profile:
${JSON.stringify(healthProfile ?? {}, null, 2)}

Recent health entries (last 5):
${JSON.stringify((recentEntries ?? []).slice(0, 5), null, 2)}
${(healthProfile as any)?.latestVitals ? `
Latest vitals from Apple Health (device data):
${JSON.stringify((healthProfile as any).latestVitals, null, 2)}
` : ''}
Return ONLY valid JSON:
{
  "answer": "Clear, personalized answer",
  "reasoning": "Clinical reasoning behind the answer",
  "confidence": "high|medium|low",
  "confidenceScore": 0.87,
  "disclaimer": "This is not medical advice. Always consult a healthcare professional.",
  "specialist": {"type": "Specialist type", "urgency": "routine|soon|urgent", "reason": "Why"} | null,
  "riskLevel": "low|medium|high|critical"
}`;

  // Build conversation history with last 10 messages
  const conversationHistory = ((historyMessages ?? []) as Array<{ role: string; content: string }>)
    .slice(-10)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

  // Add current question
  conversationHistory.push({ role: 'user', content: question });

  try {
    const raw = await callAnthropicMultiTurn(conversationHistory, env, 1000, systemPrompt);
    const aiResponse = parseJSON(raw);
    return json({ success: true, ...aiResponse });
  } catch (err: any) {
    return errResponse(err?.message ?? 'Chat failed');
  }
}

// ─── /insights — proactive insight generation ────────────────────────────────

async function handleInsights(body: AnalyzeRequest, env: Env): Promise<Response> {
  const { healthProfile, recentEntries } = body;

  const prompt = `You are a proactive health monitoring system.
Analyze this person's complete health data and identify the most important health insights.
Focus on patterns, trends, and actionable recommendations.
Return ONLY valid JSON.

Health profile:
${JSON.stringify(healthProfile ?? {}, null, 2)}

Health entries:
${JSON.stringify(recentEntries ?? [], null, 2)}

Return a JSON array of 2-4 insights:
[
  {
    "insightText": "Clear, specific insight referencing actual values",
    "severity": "low|medium|high|critical",
    "category": "Metabolic|Cardiovascular|Medication|Lifestyle|Preventive|General",
    "confidenceScore": 0.87,
    "specialist": {"type": "Specialist", "urgency": "routine|soon|urgent", "reason": "Why"} | null
  }
]

Rules:
- Only generate insights supported by actual data
- Severity critical = immediate attention needed
- Severity high = see doctor within 2 weeks
- Severity medium = monitor and follow up
- Severity low = informational
- Reference specific lab values or readings when available`;

  try {
    const raw = await callAnthropic(prompt, env, 1200);
    const insights = parseJSON(raw);
    const insightArray = Array.isArray(insights) ? insights : insights?.insights ?? [];
    return json({ success: true, insights: insightArray });
  } catch (err: any) {
    return errResponse(err?.message ?? 'Insights generation failed');
  }
}

// ─── Anthropic API call (single turn) ────────────────────────────────────────

async function callAnthropic(
  userMessage: string,
  env: Env,
  maxTokens = 1000,
  systemPrompt?: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt ?? 'You are a helpful health assistant. Return only valid JSON.',
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as any;
  const content: string = data?.content?.[0]?.text ?? '';
  if (!content) throw new Error('Empty response from Anthropic');
  return content;
}

// ─── Anthropic API call (multi-turn with history) ─────────────────────────────

async function callAnthropicMultiTurn(
  messages: Array<{ role: string; content: string }>,
  env: Env,
  maxTokens = 1000,
  systemPrompt?: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt ?? 'You are a helpful health assistant. Return only valid JSON.',
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as any;
  const content: string = data?.content?.[0]?.text ?? '';
  if (!content) throw new Error('Empty response from Anthropic');
  return content;
}

// ─── JSON parser — strips markdown code fences ────────────────────────────────

function parseJSON(raw: string): any {
  const cleaned = raw
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
  return JSON.parse(cleaned);
}

// ─── /predict — predictive health trend analysis ─────────────────────────────

async function handlePrediction(body: any, env: Env): Promise<Response> {
  const { healthProfile, entries, insights } = body;

  if (!entries || entries.length < 2) {
    return json({ success: true, predictions: [] });
  }

  const systemPrompt = `You are a predictive health analytics engine.
Your job is to analyze trends in patient health data and identify
where their health metrics are HEADING — not just where they are now.

You think like a preventive medicine specialist:
- Look for gradual worsening trends that patients miss
- Identify correlations between different health metrics
- Calculate trajectory (improving/worsening/stable)
- Estimate time-to-threshold for key metrics
- Flag anomalies that break patterns

Be specific with numbers. Reference actual values.
Never catastrophize — be clinically measured.
Always distinguish between correlation and causation.
Always include confidence level.`;

  const prompt = `Analyze this patient's health data for predictive insights.

Health Profile:
${JSON.stringify(healthProfile ?? {}, null, 2)}

Health Entries (chronological, last 90 days):
${JSON.stringify((entries ?? []).slice(0, 20), null, 2)}

Previous Insights:
${JSON.stringify((insights ?? []).slice(0, 5), null, 2)}

Perform these analyses:
1. TREND ANALYSIS: For each metric with 2+ data points, calculate direction and rate of change.
2. TRAJECTORY PREDICTION: If current trends continue, where will key metrics be in 30/60/90 days?
3. ANOMALY DETECTION: Any readings that break the pattern?
4. CORRELATION DETECTION: Are there relationships between metrics?
5. THRESHOLD ALERTS: Which metrics are approaching clinical thresholds?

Return ONLY a valid JSON array (2-4 insights max):
[
  {
    "insightText": "Specific predictive insight referencing actual values and trajectory",
    "severity": "low|medium|high|critical",
    "category": "Predictive",
    "confidenceScore": 0.87,
    "predictionType": "trend|anomaly|threshold|correlation",
    "timeframe": "30 days|60 days|90 days|immediate|ongoing",
    "currentValue": "current metric value as string or null",
    "projectedValue": "projected value if trend continues or null",
    "recommendedAction": "specific action to take",
    "specialist": {
      "type": "Specialist type",
      "urgency": "routine|soon|urgent",
      "reason": "specific reason"
    }
  }
]`;

  try {
    const content = await callAnthropic(prompt, env, 1500, systemPrompt);
    const predictions = parseJSON(content);
    const predArray = Array.isArray(predictions) ? predictions : predictions?.predictions ?? [];
    return json({ success: true, predictions: predArray });
  } catch (error: any) {
    console.error('Prediction handler error:', error);
    return errResponse(error?.message ?? 'Prediction failed', 500);
  }
}

// ─── /consult — AI doctor consultation ───────────────────────────────────────

async function handleConsultation(body: any, env: Env): Promise<Response> {
  const { consultationId, insightText, healthProfile, recentEntries } = body;

  if (!insightText?.trim()) return errResponse('insightText is required', 400);

  const now = new Date().toISOString();

  const systemPrompt = `You are Dr. Sarah Chen, MD, a board-certified internist with subspecialty training in endocrinology and preventive medicine. You have 15 years of clinical experience.

You are reviewing a patient's health data submitted through Continuum AI.
The patient has paid for an async medical consultation.

Your response must be:
- Evidence-based and clinically accurate
- Warm and empathetic in tone
- Specific to their actual data (reference real values when present)
- Actionable with clear next steps
- Appropriately cautious — never diagnose definitively
- Include urgency level and recommended follow-up timeline

IMPORTANT disclaimers to include naturally:
- This is an async review, not a substitute for in-person care
- Recommendations are educational, not prescriptive
- Seek emergency care for acute or worsening symptoms

Return ONLY valid JSON, no markdown, no explanation.`;

  const userPrompt = `Patient Health Profile:
${JSON.stringify(healthProfile ?? {}, null, 2)}

Recent Health Entries (last 5):
${JSON.stringify((recentEntries ?? []).slice(0, 5), null, 2)}

Specific Concern Flagged by AI:
${insightText}

Please provide a comprehensive async consultation response.

Return this EXACT JSON object:
{
  "doctorName": "Dr. Sarah Chen, MD",
  "credentials": "Board Certified Internist • Endocrinology Fellowship • 15 Years Experience",
  "response": "Your full clinical response here — 3-4 detailed paragraphs addressing their specific concern, referencing their actual values, explaining what it means clinically, and what they should do. Be thorough, warm, and specific.",
  "recommendations": [
    "Specific action item 1",
    "Specific action item 2",
    "Specific action item 3",
    "Specific action item 4"
  ],
  "urgencyLevel": "routine",
  "followUpIn": "4-6 weeks",
  "respondedAt": "${now}"
}

urgencyLevel must be exactly one of: "routine", "follow_up", "urgent"`;

  try {
    const content = await callAnthropic(userPrompt, env, 1800, systemPrompt);
    const doctorResponse = parseJSON(content);

    // Validate required fields
    if (!doctorResponse.doctorName || !doctorResponse.response || !doctorResponse.urgencyLevel) {
      throw new Error('Incomplete doctor response from AI');
    }

    return json({
      success: true,
      consultationId: consultationId ?? null,
      doctorResponse,
    });
  } catch (error: any) {
    console.error('Consultation handler error:', error);
    return errResponse(error?.message ?? 'Consultation processing failed', 500);
  }
}
