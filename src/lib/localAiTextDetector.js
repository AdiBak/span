/**
 * Browser-side AI text detection via Transformers.js (ONNX, no GPU quota).
 * Model: TMR (Target Mining RoBERTa) — lower false-positive rate vs Fakespot.
 * @see https://huggingface.co/Oxidane/tmr-ai-text-detector
 * @see https://huggingface.co/onnx-community/tmr-ai-text-detector-ONNX
 */

const MODEL_ID = 'onnx-community/tmr-ai-text-detector-ONNX'
/** Rough cap — RoBERTa max length is 512 tokens */
const MAX_CHARS = 8_000

let classifierPromise = null

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isAiLabel(label) {
  const lbl = String(label || '').toLowerCase()
  return (
    lbl === 'ai' ||
    lbl === 'chatgpt' ||
    lbl === 'fake' ||
    lbl === 'label_1' ||
    lbl === 'machine'
  )
}

function formatScorePercent(score) {
  const pct = score * 100
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`
}

function normalizeResults(raw) {
  if (Array.isArray(raw) && typeof raw[0]?.label === 'string') return raw
  if (Array.isArray(raw?.[0]) && typeof raw[0][0]?.label === 'string') return raw[0]
  if (raw?.label) return [raw]
  return []
}

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      env.useBrowserCache = true
      env.allowRemoteModels = true
      return pipeline('text-classification', MODEL_ID, { dtype: 'q8' })
    })()
  }
  return classifierPromise
}

/**
 * Run AI detection locally in the browser.
 * @param {string} text
 * @returns {Promise<object>} Same shape as check-ai-text edge function
 */
export async function detectAiTextLocally(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) {
    throw new Error('No text to analyze.')
  }

  const payload = trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed
  const classifier = await getClassifier()
  const raw = await classifier(payload)
  let results = normalizeResults(raw)

  if (results.length === 1) {
    const only = results[0]
    const otherLabel = isAiLabel(only.label) ? 'human' : 'ai'
    results = [
      only,
      { label: otherLabel, score: 1 - only.score },
    ]
  }

  if (!results.length) {
    throw new Error('Local model returned no scores.')
  }

  let aiScore = null
  let humanScore = null
  for (const r of results) {
    if (isAiLabel(r.label)) aiScore = r.score
    else humanScore = r.score
  }
  if (aiScore == null && humanScore != null) aiScore = 1 - humanScore
  if (humanScore == null && aiScore != null) humanScore = 1 - aiScore
  if (aiScore == null || humanScore == null) {
    throw new Error('Could not parse local model scores.')
  }

  const labels = results.map((r) => ({
    label: r.label,
    label_display: isAiLabel(r.label) ? 'AI-generated' : 'Human-written',
    score: r.score,
    percent: Math.round(r.score * 100),
  }))

  const predicted =
    aiScore >= 0.7 ? 'AI-generated' : aiScore >= 0.5 ? 'Possibly AI-generated' : 'Human-written'

  const words = wordCount(trimmed)
  const scoreLine = labels.map((r) => `${r.label}: ${formatScorePercent(r.score)}`).join(' · ')

  return {
    ai_score: aiScore,
    human_score: humanScore,
    predicted_label: predicted,
    predicted_label_display: predicted,
    predicted_score: aiScore,
    labels,
    explanation: (
      `Local TMR model (${MODEL_ID.split('/').pop()}). ` +
      `Predicted: ${predicted} (${formatScorePercent(aiScore)}). Scores — ${scoreLine}. ` +
      'Advisory only; first run downloads the model (~120MB); cached afterward.'
    ),
    text_length: trimmed.length,
    word_count: words,
    model: MODEL_ID,
    source: 'browser_transformers',
    fallback_used: false,
    raw: results,
  }
}

/** Reset cached pipeline (e.g. for tests). */
export function resetLocalAiDetectorCache() {
  classifierPromise = null
}
