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

/** Free CPU serverless inference — no ZeroGPU quota. */
const FAKESPOT_MODEL = "fakespot-ai/roberta-base-ai-text-detection-v1"

/** AI Slop Detector — TMR + pattern ensemble on CPU. */
const SCREENCOMPLY_URL = Deno.env.get("SCREENCOMPLY_SPACE_URL") ??
  "https://guardianrobot-screencomply-documents.hf.space"
const SCREENCOMPLY_TIMEOUT_MS = 90_000

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

/** Port of fakespot-ai/roberta-base-ai-text-detection-v1/utils.py */
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
  return lbl === "ai" || lbl === "label_1" || lbl === "fake" || lbl === "machine" || lbl === "chatgpt"
}

function formatResultLabel(label: string): string {
  return isAiLabel(label) ? "AI-generated" : "Human-written"
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

function scoresFromResults(results: ClassResult[]): { aiScore: number; humanScore: number } {
  if (!results.length) {
    throw new Error("Model returned no classification scores")
  }

  let aiScore: number | null = null
  let humanScore: number | null = null

  for (const r of results) {
    if (isAiLabel(r.label)) aiScore = r.score
    else humanScore = r.score
  }

  if (aiScore == null && humanScore != null) aiScore = 1 - humanScore
  if (humanScore == null && aiScore != null) humanScore = 1 - aiScore
  if (aiScore == null || humanScore == null) {
    throw new Error("Could not parse AI/human scores from model output")
  }

  return { aiScore, humanScore }
}

function buildExplanation(results: ClassResult[], aiScore: number): string {
  const sorted = [...results].sort((a, b) => b.score - a.score)
  const top = sorted[0]
  const predicted = top ? formatResultLabel(top.label) : (aiScore >= 0.5 ? "AI-generated" : "Human-written")
  const scoreLine = results
    .map((r) => `${r.label}: ${formatScorePercent(r.score)}`)
    .join(" · ")

  return (
    `Server fallback (Fakespot). Predicted: ${predicted} (${formatScorePercent(top?.score ?? aiScore)}). ` +
    `Scores — ${scoreLine}. Advisory only.`
  )
}

type ScreenComplyDetectorResult = {
  detector_name?: string
  score?: number
  confidence?: string
  explanation?: string
}

type ScreenComplyResponse = {
  status?: string
  message?: string
  overall_ai_score?: number
  overall_ai_score_percentage?: string
  overall_confidence?: string
  status_label?: string
  detector_results?: Record<string, ScreenComplyDetectorResult>
  enabled_detectors?: string[]
  text_stats?: { word_count?: number; character_count?: number }
}

async function detectWithScreenComply(text: string): Promise<ScreenComplyResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SCREENCOMPLY_TIMEOUT_MS)

  try {
    const resp = await fetch(`${SCREENCOMPLY_URL.replace(/\/$/, "")}/api/analyze/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, filename: "span-check.txt" }),
      signal: controller.signal,
    })

    const data = await resp.json().catch(() => ({})) as ScreenComplyResponse & { error_details?: string }

    if (!resp.ok || data.status !== "success") {
      throw new Error(
        data.message || data.error_details || `ScreenComply API failed (${resp.status})`,
      )
    }

    if (typeof data.overall_ai_score !== "number") {
      throw new Error("ScreenComply returned no overall_ai_score")
    }

    return data
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("ScreenComply timed out — Space may be cold, try again")
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

function mapScreenComplyResponse(data: ScreenComplyResponse, textLength: number, words: number) {
  const aiScore = data.overall_ai_score as number
  const humanScore = 1 - aiScore
  const detectors = data.detector_results ?? {}

  const labels = Object.entries(detectors).map(([key, d]) => ({
    label: key,
    label_display: d.detector_name ?? key,
    score: d.score ?? 0,
    percent: Math.round((d.score ?? 0) * 100),
  }))

  const detectorDetails = Object.entries(detectors).map(([key, d]) => ({
    id: key,
    name: d.detector_name ?? key,
    score: d.score ?? 0,
    confidence: d.confidence ?? null,
    explanation: d.explanation ?? null,
  }))

  return {
    ai_score: aiScore,
    human_score: humanScore,
    predicted_label: data.status_label ?? null,
    predicted_label_display: data.status_label ?? null,
    predicted_score: aiScore,
    labels,
    detector_details: detectorDetails,
    explanation: data.status_label ?? null,
    text_length: textLength,
    word_count: data.text_stats?.word_count ?? words,
    model: "guardianrobot/screencomply_documents",
    source: "screencomply_space",
    fallback_used: false,
    raw: data,
  }
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

    const inputText = text.trim()
    const textLength = inputText.length
    const words = wordCount(inputText)

    if (inputText.length < 10) {
      return new Response(
        JSON.stringify({ error: "Text must be at least 10 characters for AI detection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    try {
      const screenComply = await detectWithScreenComply(inputText)
      return new Response(
        JSON.stringify(mapScreenComplyResponse(screenComply, textLength, words)),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    } catch (screenErr) {
      console.error("ScreenComply failed, falling back to Fakespot:", screenErr)
    }

    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({
          error: "AI detection service unavailable (ScreenComply down and HF_TOKEN missing for fallback)",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const cleanedText = cleanText(inputText)

    if (cleanedText.length === 0) {
      return new Response(
        JSON.stringify({ error: "text is empty after preprocessing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const hfResponse = await fetch(
      `https://router.huggingface.co/hf-inference/models/${FAKESPOT_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: cleanedText, parameters: { top_k: 2 } }),
      },
    )

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text()
      console.error("HF API error:", hfResponse.status, errorText)
      if (hfResponse.status === 503) {
        return new Response(
          JSON.stringify({ error: "AI model is loading, please try again in ~20 seconds" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
      return new Response(
        JSON.stringify({ error: "AI detection request failed", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const hfData = await hfResponse.json()
    const results = parseClassificationResults(hfData)
    const { aiScore, humanScore } = scoresFromResults(results)

    const labels = results.map((r) => ({
      label: r.label,
      label_display: formatResultLabel(r.label),
      score: r.score,
      percent: Math.round(r.score * 100),
    }))

    const sorted = [...results].sort((a, b) => b.score - a.score)
    const top = sorted[0]

    return new Response(
      JSON.stringify({
        ai_score: aiScore,
        human_score: humanScore,
        predicted_label: top?.label ?? null,
        predicted_label_display: top ? formatResultLabel(top.label) : null,
        predicted_score: top?.score ?? null,
        labels,
        explanation: buildExplanation(results, aiScore),
        text_length: textLength,
        word_count: words,
        model: FAKESPOT_MODEL,
        source: "hf_inference",
        fallback_used: true,
        raw: results,
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
