import React from 'react'
import { ADVISORS_IMAGES_BASE_URL } from '../lib/supabasePublicUrls'
import './AdvisorsBoard.css'

/**
 * Public Advisory Board card grid for the Directory page.
 * @param {{ advisors: Array<{ advisor_id: string, full_name: string, title?: string, company?: string, photo?: string, linkedin_url?: string }>, searchQuery?: string }} props
 */
export default function AdvisorsBoard({ advisors = [], searchQuery = '' }) {
  const q = searchQuery.trim().toLowerCase()
  const visible = q
    ? advisors.filter((a) => {
        const blob = [a.full_name, a.title, a.company].filter(Boolean).join(' ').toLowerCase()
        return blob.includes(q)
      })
    : advisors

  if (!advisors.length) return null

  if (q && visible.length === 0) {
    return null
  }

  return (
    <section className="advisors-board mb-5" aria-labelledby="advisors-board-heading">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div>
          <h2 id="advisors-board-heading" className="h3 mb-1">
            Advisory Board
          </h2>
          <p className="text-muted mb-0 small">
            Healthcare and industry leaders who advise SPAN.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {visible.map((advisor) => {
          const photoUrl = advisor.photo
            ? `${ADVISORS_IMAGES_BASE_URL}/${advisor.photo}`
            : null
          const subtitle = [advisor.title, advisor.company].filter(Boolean).join(' · ')

          return (
            <div key={advisor.advisor_id} className="col-6 col-md-4 col-lg-3">
              <article className="advisor-card h-100 text-center">
                <div className="d-flex justify-content-center">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={advisor.full_name}
                      className="advisor-photo rounded-circle object-fit-cover"
                      width="160"
                      height="160"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div
                      className="advisor-photo-placeholder rounded-circle d-flex align-items-center justify-content-center bg-secondary-subtle text-secondary"
                      aria-hidden="true"
                    >
                      <i className="bi bi-person fs-1"></i>
                    </div>
                  )}
                </div>
                <div className="card-body px-1">
                  <h3 className="h6 mb-1">{advisor.full_name}</h3>
                  {subtitle && <p className="small text-muted mb-2">{subtitle}</p>}
                  {advisor.linkedin_url && (
                    <a
                      href={advisor.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-dark"
                      aria-label={`LinkedIn profile for ${advisor.full_name}`}
                    >
                      <i className="bi bi-linkedin"></i>
                    </a>
                  )}
                </div>
              </article>
            </div>
          )
        })}
      </div>
    </section>
  )
}
