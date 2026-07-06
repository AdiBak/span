import React from 'react'

const DETECTOR_DISPLAY_NAMES = {
  tmr_detector: 'TMR model',
  pattern: 'Pattern check',
}

function formatDetectorName(key) {
  if (!key) return 'Detector'
  const k = String(key).toLowerCase()
  if (DETECTOR_DISPLAY_NAMES[k]) return DETECTOR_DISPLAY_NAMES[k]
  if (k === 'human' || k === 'human-written') return 'Human-written'
  if (k === 'ai' || k === 'chatgpt' || k === 'ai-generated') return 'AI-generated'
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function scoreBarClass(pct) {
  if (pct >= 85) return 'bg-danger'
  if (pct >= 55) return 'bg-warning'
  return 'bg-success'
}

/** Turn long pattern explanations into shorter bullet-style fragments. */
function formatExplanation(text) {
  if (!text) return null
  const t = String(text).trim()
  if (t.includes('Pattern signals')) {
    return t
      .replace(/^Pattern signals\s*—?\s*/i, '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' · ')
  }
  if (t.includes('TMR model predicts:')) {
    return t.replace(/^TMR model predicts:\s*/i, '')
  }
  return t
}

function buildDetectorRows(result) {
  const rows = []

  const screenComply = result.raw?.detector_results
  if (screenComply && typeof screenComply === 'object') {
    for (const [key, d] of Object.entries(screenComply)) {
      const aiPct = Math.round((d.score ?? 0) * 100)
      rows.push({
        id: key,
        name: formatDetectorName(d.detector_name || key),
        aiPct,
        confidence: d.confidence,
        explanation: formatExplanation(d.explanation),
      })
    }
    return rows
  }

  if (Array.isArray(result.detector_details) && result.detector_details.length) {
    return result.detector_details.map((d) => ({
      id: d.id ?? d.name,
      name: formatDetectorName(d.name),
      aiPct: Math.round((d.score ?? 0) * 100),
      confidence: d.confidence,
      explanation: formatExplanation(d.explanation),
    }))
  }

  if (result.fallback_used && result.ai_score != null) {
    return [
      {
        id: 'fakespot',
        name: 'Fakespot classifier',
        aiPct: Math.round(result.ai_score * 100),
        confidence: null,
        explanation: null,
      },
    ]
  }

  if (result.source === 'browser_transformers' && result.ai_score != null) {
    return [
      {
        id: 'local-tmr',
        name: 'TMR model (local)',
        aiPct: Math.round(result.ai_score * 100),
        confidence: null,
        explanation: null,
      },
    ]
  }

  if (Array.isArray(result.labels) && result.labels.length) {
    for (const l of result.labels) {
      const isAi =
        /ai|chatgpt|fake|machine|label_1/i.test(String(l.label)) &&
        !/human/i.test(String(l.label))
      const aiPct = isAi
        ? Math.round((l.score ?? 0) * 100)
        : Math.round((1 - (l.score ?? 0)) * 100)
      rows.push({
        id: l.label,
        name: formatDetectorName(l.label_display || l.label),
        aiPct,
        confidence: null,
        explanation: null,
      })
    }
  }

  return rows
}

function sourceBadge(result) {
  if (result.fallback_used) {
    return <span className="badge bg-secondary">Fakespot fallback</span>
  }
  if (result.source === 'screencomply_space') {
    return <span className="badge bg-info text-dark">TMR ensemble</span>
  }
  if (result.source === 'browser_transformers') {
    return <span className="badge bg-info text-dark">Local TMR</span>
  }
  return null
}

export function AiScoreBadge({ aiScore }) {
  if (aiScore == null) return null
  const pct = Math.round(aiScore * 100)
  let badgeClass = 'bg-success'
  let label = 'Likely human'
  if (pct >= 85) {
    badgeClass = 'bg-danger'
    label = 'Likely AI-generated'
  } else if (pct >= 55) {
    badgeClass = 'bg-warning text-dark'
    label = 'Uncertain'
  }
  return (
    <span className={`badge ${badgeClass}`} title={`Overall score: ${pct}% AI`}>
      <i className="bi bi-robot me-1"></i>
      {pct}% AI — {label}
    </span>
  )
}

function DetectorRow({ name, aiPct, confidence, explanation, isLast }) {
  return (
    <div
      className={`ai-check-detector-row mb-2 pb-2${isLast ? '' : ' border-bottom border-light-subtle'}`}
    >
      <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
        <span className="fw-semibold">{name}</span>
        <span className="text-nowrap">
          {aiPct}% AI
          {confidence && (
            <span className="text-muted ms-1">({confidence.replace(/_/g, ' ')})</span>
          )}
        </span>
      </div>
      <div className="progress rounded-pill" style={{ height: 8 }}>
        <div
          className={`progress-bar ${scoreBarClass(aiPct)}`}
          role="progressbar"
          style={{ width: `${Math.min(100, Math.max(0, aiPct))}%` }}
          aria-valuenow={aiPct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {explanation && (
        <p className="mb-0 mt-1 text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
          {explanation}
        </p>
      )}
    </div>
  )
}

export default function AiCheckResultPanel({ result }) {
  if (!result || result.ai_score == null) return null

  const detectorRows = buildDetectorRows(result)
  const overallConfidence = result.raw?.overall_confidence
  const verdict = result.predicted_label_display || result.predicted_label

  return (
    <div className="border rounded p-3 bg-light small mt-2">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <AiScoreBadge aiScore={result.ai_score} />
        {sourceBadge(result)}
        {result.word_count != null && (
          <span className="text-muted">{result.word_count.toLocaleString()} words analyzed</span>
        )}
      </div>

      {(verdict || overallConfidence || result.ai_score != null) && (
        <div className="mb-3 p-2 rounded bg-white border">
          <div className="fw-semibold mb-1">Summary</div>
          <ul className="mb-0 ps-3">
            {verdict && (
              <li>
                <strong>Verdict:</strong> {verdict}
              </li>
            )}
            {overallConfidence && (
              <li>
                <strong>Confidence:</strong> {String(overallConfidence).replace(/_/g, ' ')}
              </li>
            )}
            <li>
              <strong>Overall score:</strong> {Math.round(result.ai_score * 100)}% AI /{' '}
              {Math.round((result.human_score ?? 1 - result.ai_score) * 100)}% human
            </li>
          </ul>
        </div>
      )}

      {detectorRows.length > 0 && (
        <div className="mb-2">
          <div className="fw-semibold mb-2">Breakdown</div>
          {detectorRows.map((row, index) => (
            <DetectorRow
              key={row.id}
              {...row}
              isLast={index === detectorRows.length - 1}
            />
          ))}
        </div>
      )}

      <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
        Advisory signal only — detectors can misread polished human writing or edited AI text.
      </p>
    </div>
  )
}
