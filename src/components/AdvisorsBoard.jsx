import { ADVISORS_IMAGES_BASE_URL, MEMBERS_IMAGES_BASE_URL } from '../lib/supabasePublicUrls'
import { memberSiteDisplayName } from '../lib/memberDisplayName'
import './AdvisorsBoard.css'

/**
 * Card grid for Leadership tab sections (EDs, team leads, Board of Mentors).
 */
export function DirectoryPeopleGrid({
  title,
  subtitle,
  headingId,
  people = [],
  emptyMessage = null,
}) {
  if (!people.length) {
    if (!emptyMessage) return null
    return (
      <section className="advisors-board mb-5" aria-labelledby={headingId}>
        <div className="mb-3">
          <h2 id={headingId} className="h3 mb-1">
            {title}
          </h2>
          {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
        </div>
        <p className="text-muted small mb-0">{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="advisors-board mb-5" aria-labelledby={headingId}>
      <div className="mb-3">
        <h2 id={headingId} className="h3 mb-1">
          {title}
        </h2>
        {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
      </div>

      <div className="row g-4">
        {people.map((person) => (
          <div key={person.id} className="col-6 col-md-4 col-lg-3">
            <article className="advisor-card h-100 text-center">
              <div className="d-flex justify-content-center">
                {person.photoUrl ? (
                  <img
                    src={person.photoUrl}
                    alt={person.name}
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
                <h3 className="h6 mb-1">{person.name}</h3>
                {person.subtitle && <p className="small text-muted mb-2">{person.subtitle}</p>}
                {person.linkedinUrl && (
                  <a
                    href={person.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-dark"
                    aria-label={`LinkedIn profile for ${person.name}`}
                  >
                    <i className="bi bi-linkedin"></i>
                  </a>
                )}
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Same public criterion as homepage TeamSection: role is Executive Director. */
export function isPublicExecutiveDirector(member) {
  return (member.role || '').trim() === 'Executive Director'
}

/**
 * Role titles that signal committee / division leadership (not EDs).
 * Examples: "Team 2 Team Lead", "Lead Web Dev", "Director of Communications".
 */
export function isPublicDivisionLeadRole(role) {
  const r = (role || '').trim().toLowerCase()
  if (!r || r === 'executive director') return false
  if (r.includes('team lead')) return true
  if (/\blead\b/.test(r)) return true
  if (/\bdirector\b/.test(r)) return true
  return false
}

export function mentorPeopleFromAdvisors(advisors = [], searchQuery = '') {
  const q = searchQuery.trim().toLowerCase()
  return advisors
    .filter((a) => {
      if (!q) return true
      const blob = [a.full_name, a.title, a.company].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(q)
    })
    .map((advisor) => ({
      id: advisor.advisor_id,
      name: advisor.full_name,
      subtitle: [advisor.title, advisor.company].filter(Boolean).join(' · '),
      photoUrl: advisor.photo ? `${ADVISORS_IMAGES_BASE_URL}/${advisor.photo}` : null,
      linkedinUrl: advisor.linkedin_url || null,
    }))
}

export function executivePeopleFromMembers(members = [], searchQuery = '') {
  const q = searchQuery.trim().toLowerCase()
  return members
    .filter((m) => isPublicExecutiveDirector(m))
    .filter((m) => {
      if (!q) return true
      const blob = [m.name, m.role, m.location, m.school].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(q)
    })
    .map((m) => ({
      id: String(m.memberId),
      name: m.name,
      subtitle: m.role || 'Executive Director',
      photoUrl: `${MEMBERS_IMAGES_BASE_URL}/${m.image || 'default.jpg'}`,
      linkedinUrl: m.linkedinUrl || null,
    }))
}

/**
 * Merge policy_team_leads RPC rows with role-heuristic leads from the members list.
 * Prefers team names from the RPC when present. Excludes EDs.
 */
export function divisionLeadPeopleFromSources({
  members = [],
  teamLeadRows = [],
  searchQuery = '',
} = {}) {
  const q = searchQuery.trim().toLowerCase()
  const byId = new Map()

  for (const row of teamLeadRows || []) {
    const id = String(row.member_id)
    const name =
      memberSiteDisplayName(row) ||
      [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
      'Member'
    const subtitle = [row.role, row.team_names].filter(Boolean).join(' · ')
    byId.set(id, {
      id,
      name,
      subtitle,
      photoUrl: `${MEMBERS_IMAGES_BASE_URL}/${row.image || 'default.jpg'}`,
      linkedinUrl: row.linkedin || null,
      sortLast: (row.last_name || '').toLowerCase(),
      sortFirst: (row.first_name || '').toLowerCase(),
    })
  }

  for (const m of members || []) {
    if (isPublicExecutiveDirector(m)) continue
    if (!isPublicDivisionLeadRole(m.role)) continue
    const id = String(m.memberId)
    if (byId.has(id)) continue
    byId.set(id, {
      id,
      name: m.name,
      subtitle: m.role || '',
      photoUrl: `${MEMBERS_IMAGES_BASE_URL}/${m.image || 'default.jpg'}`,
      linkedinUrl: m.linkedinUrl || null,
      sortLast: (m.lastName || '').toLowerCase(),
      sortFirst: (m.firstName || '').toLowerCase(),
    })
  }

  let people = Array.from(byId.values())
  if (q) {
    people = people.filter((p) => {
      const blob = [p.name, p.subtitle].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(q)
    })
  }

  people.sort((a, b) => {
    if (a.sortLast === b.sortLast) return a.sortFirst.localeCompare(b.sortFirst)
    return a.sortLast.localeCompare(b.sortLast)
  })

  return people.map(({ sortLast, sortFirst, ...person }) => person)
}
