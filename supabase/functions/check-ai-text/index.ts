import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const HF_TOKEN = Deno.env.get("HF_TOKEN") ?? ""

/** DivEye HF Space — https://huggingface.co/spaces/pinyuchen/Diveye_AI_text_detector */
const DIVEYE_SPACE_URL = Deno.env.get("DIVEYE_SPACE_URL") ??
  "https://pinyuchen-diveye-ai-text-detector.hf.space"
const DIVEYE_API = "/detect_ai_text"
const DIVEYE_MIN_WORDS = 15
const DIVEYE_TIMEOUT_MS = 120_000

const FAKESPOT_MODEL = "fakespot-ai/roberta-base-ai-text-detection-v1"

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
}

function formatScorePercent(score: number): string {
  const pct = score * 100
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function stripMarkdown(md: string): string {
  return md.replace(/\*\*/g, "").replace(/^[^\w]*\s*/, "").trim()
}

function predictedLabelFromScore(aiScore: number): string {
  if (aiScore >= 0.7) return "AI-generated"
  if (aiScore >= 0.5) return "Possibly AI-generated"
  return "Human-written"
}

type BarPlotPayload = {
  columns?: string[]
  data?: [string, number][]
}

function labelsFromBarPlot(aiScore: number, barPlot?: BarPlotPayload) {
  if (barPlot?.data?.length) {
    return barPlot.data.map(([source, pct]) => ({
      label: source,
      label_display: source,
      score: pct / 100,
      percent: Math.round(pct),
    }))
  }
  return [
    { label: "AI Generated", label_display: "AI-generated", score: aiScore, percent: Math.round(aiScore * 100) },
    { label: "Human Written", label_display: "Human-written", score: 1 - aiScore, percent: Math.round((1 - aiScore) * 100) },
  ]
}

function authHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** Gradio queue API: POST to submit, then poll SSE for `event: complete`. */
async function callGradioSpace(
  spaceUrl: string,
  apiName: string,
  data: unknown[],
  token: string,
  timeoutMs: number,
): Promise<unknown[]> {
  const base = spaceUrl.replace(/\/$/, "")
  const submitRes = await fetch(`${base}/gradio_api/call${apiName}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ data }),
  })

  if (!submitRes.ok) {
    const details = await submitRes.text()
    throw new Error(`DivEye Space submit failed (${submitRes.status}): ${details}`)
  }

  const { event_id } = await submitRes.json() as { event_id?: string }
  if (!event_id) throw new Error("DivEye Space returned no event_id")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const resultRes = await fetch(`${base}/gradio_api/call${apiName}/${event_id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })

    if (!resultRes.ok) {
      const details = await resultRes.text()
      throw new Error(`DivEye Space result failed (${resultRes.status}): ${details}`)
    }

    const sseText = await resultRes.text()
    for (const block of sseText.split("\n\n")) {
      if (block.includes("event: error")) {
        const dataLine = block.split("\n").find((l) => l.startsWith("data: "))
        throw new Error(dataLine ? dataLine.slice(6) : "DivEye Space returned an error")
      }
      if (block.includes("event: complete")) {
        const dataLine = block.split("\n").find((l) => l.startsWith("data: "))
        if (!dataLine) throw new Error("DivEye Space response missing data")
        return JSON.parse(dataLine.slice(6)) as unknown[]
      }
    }

    throw new Error("DivEye Space response timed out or missing complete event")
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("DivEye Space timed out — GPU queue may be busy, try again")
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

type DiveyeResult = {
  aiScore: number
  humanScore: number
  message: string
  barPlot?: BarPlotPayload
}

async function detectWithDiveye(text: string, token: string): Promise<DiveyeResult> {
  const words = wordCount(text)
  if (words < DIVEYE_MIN_WORDS) {
    throw new Error(
      `DivEye requires at least ${DIVEYE_MIN_WORDS} words (got ${words}). ` +
      "Additional info may be too short for reliable detection.",
    )
  }

  const raw = await callGradioSpace(
    DIVEYE_SPACE_URL,
    DIVEYE_API,
    [text],
    token,
    DIVEYE_TIMEOUT_MS,
  )

  const message = typeof raw[0] === "string" ? raw[0] : ""
  const aiScore = typeof raw[1] === "number" ? raw[1] : null
  const barPlot = raw[2] as BarPlotPayload | undefined

  if (message.includes("Model not loaded") || message.includes("require a GPU")) {
    throw new Error("DivEye Space GPU is unavailable — try again in a few minutes")
  }
  if (message.includes("Please enter some text with at least")) {
    throw new Error(message.replace(/^[^\w]*/, "").trim())
  }
  if (aiScore == null || Number.isNaN(aiScore)) {
    throw new Error(message || "DivEye Space returned an unexpected response")
  }

  return {
    aiScore,
    humanScore: 1 - aiScore,
    message: stripMarkdown(message),
    barPlot,
  }
}

/** Port of fakespot-ai/roberta-base-ai-text-detection-v1/utils.py — fallback only */
function cleanMarkdown(mdText: string): string {
  let t = mdText
  t = t.replace(/```[\s\S]*?```/g, "")
  t = t.replace(/`[^`]*`/g, "")
  t = t.replace(/!\[.*?\]\(.*?\)/g, "")
  t = t.replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
  t = t.replace(/(\*\*|__)(.*?)\1/g, "$2")
  t = t.replace(/(\*|_)(.*?)\1/g, "$2")
  t = t.replace(/#+ /g, "")
  t = t.replace(/^>.*$/gm, "")
  t = t.replace(/^(\s*[-*+]|\d+\.)\s+/gm, "")
  t = t.replace(/^\s*[-*_]{3,}\s*$/gm, "")
  t = t.replace(/\|.*?\|/g, "")
  t = t.replace(/<.*?>/g, "")
  return t
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function cleanText(raw: string): string {
  let t = cleanMarkdown(raw)
  t = t.replace(/\n/g, " ")
  t = t.replace(/\t/g, " ")
  t = t.replace(/\^M/g, " ")
  t = t.replace(/\r/g, " ")
  t = t.replace(/ ,/g, ",")
  t = t.replace(/ +/g, " ")
  return t.trim()
}

type ClassResult = { label: string; score: number }

function isAiLabel(label: string): boolean {
  const lbl = label.toLowerCase()
  return lbl === "ai" || lbl === "label_1" || lbl === "fake" || lbl === "machine"
}

function parseClassificationResults(hfData: unknown): ClassResult[] {
  if (Array.isArray(hfData?.[0]) && typeof hfData[0][0]?.label === "string") {
    return hfData[0] as ClassResult[]
  }
  if (Array.isArray(hfData) && typeof hfData[0]?.label === "string") {
    return hfData as ClassResult[]
  }
  return []
}

async function detectWithFakespot(text: string, token: string) {
  const cleanedText = cleanText(text)
  const hfResponse = await fetch(
    `https://router.huggingface.co/hf-inference/models/${FAKESPOT_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: cleanedText, parameters: { top_k: 2 } }),
    },
  )

  if (!hfResponse.ok) {
    const details = await hfResponse.text()
    throw new Error(`Fakespot fallback failed (${hfResponse.status}): ${details}`)
  }

  const hfData = await hfResponse.json()
  const results = parseClassificationResults(hfData)
  if (!results.length) throw new Error("Fakespot returned no scores")

  let aiScore: number | null = null
  let humanScore: number | null = null
  for (const r of results) {
    if (isAiLabel(r.label)) aiScore = r.score
    else humanScore = r.score
  }
  if (aiScore == null && humanScore != null) aiScore = 1 - humanScore
  if (humanScore == null && aiScore != null) humanScore = 1 - aiScore
  if (aiScore == null || humanScore == null) {
    throw new Error("Could not parse Fakespot scores")
  }

  return { aiScore, humanScore, results }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const body = await req.json()
    const { text } = body as { text?: string }

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const token = authHeader.replace("Bearer ", "")
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: callerMember } = await admin
      .from("members")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!isExec(callerMember)) {
      return new Response(
        JSON.stringify({ error: "Only executives can run AI text detection" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: "AI detection service not configured (HF_TOKEN missing)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const inputText = text.trim()
    const textLength = inputText.length
    const words = wordCount(inputText)

    if (words < DIVEYE_MIN_WORDS) {
      return new Response(
        JSON.stringify({
          error:
            `Text is too short for DivEye (${words} words; need at least ${DIVEYE_MIN_WORDS}). ` +
            "Try a longer additional-info response.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    let aiScore: number
    let humanScore: number
    let explanation: string
    let labels: ReturnType<typeof labelsFromBarPlot>
    let model: string
    let source: string
    let raw: unknown
    let fallbackUsed = false

    try {
      const diveye = await detectWithDiveye(inputText, HF_TOKEN)
      aiScore = diveye.aiScore
      humanScore = diveye.humanScore
      labels = labelsFromBarPlot(aiScore, diveye.barPlot)
      explanation = (
        `${diveye.message} ` +
        `AI: ${formatScorePercent(aiScore)} · Human: ${formatScorePercent(humanScore)}. ` +
        "Advisory only; detectors can misclassify polished human writing."
      )
      model = "pinyuchen/Diveye_AI_text_detector"
      source = "hf_space"
      raw = { message: diveye.message, ai_probability: aiScore, bar_plot: diveye.barPlot }
    } catch (diveyeErr) {
      console.error("DivEye failed, falling back to Fakespot:", diveyeErr)
      const fakespot = await detectWithFakespot(inputText, HF_TOKEN)
      aiScore = fakespot.aiScore
      humanScore = fakespot.humanScore
      labels = fakespot.results.map((r) => ({
        label: r.label,
        label_display: isAiLabel(r.label) ? "AI-generated" : "Human-written",
        score: r.score,
        percent: Math.round(r.score * 100),
      }))
      explanation = (
        `DivEye unavailable; used Fakespot fallback. ` +
        `AI: ${formatScorePercent(aiScore)} · Human: ${formatScorePercent(humanScore)}.`
      )
      model = FAKESPOT_MODEL
      source = "hf_inference_fallback"
      raw = fakespot.results
      fallbackUsed = true
    }

    const predicted = predictedLabelFromScore(aiScore)

    return new Response(
      JSON.stringify({
        ai_score: aiScore,
        human_score: humanScore,
        predicted_label: predicted,
        predicted_label_display: predicted,
        predicted_score: aiScore,
        labels,
        explanation,
        text_length: textLength,
        word_count: words,
        model,
        source,
        fallback_used: fallbackUsed,
        raw,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("check-ai-text error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
}, { verifyJwt: false })
