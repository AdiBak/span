import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fetchPublicDirectoryMembers } from '../lib/publicData'
import { memberLegalName, memberSiteDisplayName } from '../lib/memberDisplayName'
import Pagination from '../components/Pagination'
import DirectoryEmailGateModal from '../components/DirectoryEmailGateModal'
import {
  DirectoryPeopleGrid,
  executivePeopleFromMembers,
  mentorPeopleFromAdvisors,
  divisionLeadPeopleFromSources,
} from '../components/AdvisorsBoard'
import './DirectoryPage.css'

/** Production: real key from CI. Dev: Cloudflare dummy “always pass” key (works on localhost without hostname setup). Set VITE_TURNSTILE_USE_REAL_KEY=true to test your real site key locally. */
const TURNSTILE_SITE_KEY = import.meta.env.PROD
  ? import.meta.env.VITE_TURNSTILE_SITE_KEY
  : import.meta.env.VITE_TURNSTILE_USE_REAL_KEY === 'true'
    ? import.meta.env.VITE_TURNSTILE_SITE_KEY
    : '1x00000000000000000000AA'

const ITEMS_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

function DirectoryPage() {
  const [members, setMembers] = useState([])
  const [advisors, setAdvisors] = useState([])
  const [teamLeadRows, setTeamLeadRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [error, setError] = useState(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimeoutRef = useRef(null)
  const [emailGate, setEmailGate] = useState(null)
  const [activeTab, setActiveTab] = useState('leadership')

  // Initialize tab + search from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const search = params.get('search')
    const tab = params.get('tab')
    if (search) {
      setSearchQuery(search)
      setDebouncedSearch(search)
    }
    if (tab === 'directory' || tab === 'leadership') {
      setActiveTab(tab)
    } else if (search) {
      // School carousel deep-links use ?search= — open full directory
      setActiveTab('directory')
    }
  }, [])

  useEffect(() => {
    fetchDirectoryData()
  }, [])

  useEffect(() => {
    const initAOS = () => {
      if (window.AOS && typeof window.AOS.init === 'function') {
        window.AOS.init({
          duration: 1000,
          once: false,
          mirror: false,
        })
        if (typeof window.AOS.refreshHard === 'function') {
          window.AOS.refreshHard()
        } else if (typeof window.AOS.refresh === 'function') {
          window.AOS.refresh()
        }
      }
    }

    if (window.AOS) {
      initAOS()
    } else {
      const checkAOS = setInterval(() => {
        if (window.AOS) {
          clearInterval(checkAOS)
          initAOS()
        }
      }, 50)
      return () => clearInterval(checkAOS)
    }
  }, [])

  useEffect(() => {
    if (!loading && window.AOS && typeof window.AOS.refresh === 'function') {
      window.AOS.refresh()
    }
  }, [loading, error, activeTab])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Sync search + tab to URL
  useEffect(() => {
    const url = new URL(window.location)
    if (debouncedSearch.trim()) {
      url.searchParams.set('search', debouncedSearch)
    } else {
      url.searchParams.delete('search')
    }
    if (activeTab === 'directory') {
      url.searchParams.set('tab', 'directory')
    } else {
      url.searchParams.set('tab', 'leadership')
    }
    window.history.replaceState({}, '', url)
  }, [debouncedSearch, activeTab])

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const search = params.get('search') || ''
      const tab = params.get('tab')
      setSearchQuery(search)
      setDebouncedSearch(search)
      setCurrentPage(1)
      if (tab === 'directory' || tab === 'leadership') {
        setActiveTab(tab)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  async function fetchDirectoryData() {
    try {
      setLoading(true)
      const [membersResult, advisorsResult, teamLeadsResult] = await Promise.all([
        fetchPublicDirectoryMembers({ requireRegistration: true }),
        supabase
          .from('advisors')
          .select('advisor_id, full_name, title, company, photo, linkedin_url, display_order')
          .eq('active', true)
          .order('display_order', { ascending: true })
          .order('full_name', { ascending: true }),
        supabase.rpc('get_public_directory_team_leads'),
      ])

      if (advisorsResult.error) {
        console.warn('Board of Mentors load skipped:', advisorsResult.error.message)
        setAdvisors([])
      } else {
        setAdvisors(advisorsResult.data || [])
      }
      if (teamLeadsResult.error) {
        console.warn('Team leads RPC skipped:', teamLeadsResult.error.message)
        setTeamLeadRows([])
      } else {
        setTeamLeadRows(teamLeadsResult.data || [])
      }

      const processedMembers = (membersResult || []).map((m) => {
        const firstName = (m.first_name || '').trim()
        const lastName = (m.last_name || '').trim()
        const displayName = memberSiteDisplayName(m) || m.email || ''
        const legal = memberLegalName(m)
        return {
          memberId: m.member_id,
          firstName,
          lastName,
          name: displayName,
          searchText: [displayName, legal, firstName, lastName, m.middle_name, m.preferred_name, m.school_name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          school: m.school_name || '',
          city: m.city || '',
          state: m.state || '',
          location: m.city && m.state ? `${m.city}, ${m.state}` : m.city || m.state || '',
          email: m.email || '',
          role: m.role || '',
          image: m.image || 'default.jpg',
          linkedinUrl: m.linkedin_url || m.linkedin || '',
        }
      })

      processedMembers.sort(sortByName)
      setMembers(processedMembers)
      setLoading(false)
    } catch (err) {
      console.error('Directory load error:', err)
      setError('Failed to load member data. Please try again later.')
      setLoading(false)
    }
  }

  function sortByName(a, b) {
    const lastA = (a.lastName || a.name.split(' ').slice(-1)[0] || '').toLowerCase()
    const lastB = (b.lastName || b.name.split(' ').slice(-1)[0] || '').toLowerCase()
    if (lastA === lastB) {
      const firstA = (a.firstName || a.name.split(' ').slice(0, -1).join(' ') || '').toLowerCase()
      const firstB = (b.firstName || b.name.split(' ').slice(0, -1).join(' ') || '').toLowerCase()
      return firstA.localeCompare(firstB)
    }
    return lastA.localeCompare(lastB)
  }

  const leadershipExecutives = useMemo(
    () => executivePeopleFromMembers(members, debouncedSearch),
    [members, debouncedSearch]
  )

  const leadershipDivisionLeads = useMemo(
    () =>
      divisionLeadPeopleFromSources({
        members,
        teamLeadRows,
        searchQuery: debouncedSearch,
      }),
    [members, teamLeadRows, debouncedSearch]
  )

  const leadershipMentors = useMemo(
    () => mentorPeopleFromAdvisors(advisors, debouncedSearch),
    [advisors, debouncedSearch]
  )

  const filteredAndSortedMembers = useMemo(() => {
    let filtered = [...members]

    if (debouncedSearch.trim()) {
      const queryLower = debouncedSearch.toLowerCase()
      filtered = filtered.filter((member) => {
        const blob = [member.searchText, member.school, member.location, member.email, member.role]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return blob.includes(queryLower)
      })
    }

    filtered.sort((a, b) => {
      if (sortKey === 'name') {
        return sortAsc ? sortByName(a, b) : sortByName(b, a)
      }
      const valA = (a[sortKey] || '').toLowerCase()
      const valB = (b[sortKey] || '').toLowerCase()
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })

    return filtered
  }, [members, debouncedSearch, sortKey, sortAsc])

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedMembers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAndSortedMembers, currentPage])

  const totalPages = Math.ceil(filteredAndSortedMembers.length / ITEMS_PER_PAGE)

  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
    setCurrentPage(1)
  }

  function handleSearchChange(e) {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  function handleTabChange(tab) {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  function handlePageChange(page) {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDirectoryEmailClick(member) {
    if (!member.email) return
    if (TURNSTILE_SITE_KEY) {
      setEmailGate({ name: member.name, email: member.email })
    } else {
      window.location.href = `mailto:${member.email}`
    }
  }

  function getSortIcon(key) {
    if (sortKey !== key) {
      return <i className="bi bi-arrow-down-up"></i>
    }
    return sortAsc ? <i className="bi bi-arrow-up"></i> : <i className="bi bi-arrow-down"></i>
  }

  const heroLead =
    'Meet SPAN leadership, our Board of Mentors, and student advocates across the nation.'

  if (error) {
    return (
      <div className="directory-page">
        <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
          <div className="parallax-bg" aria-hidden="true"></div>
          <div className="container position-relative z-1">
            <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">
              Members
            </h1>
            <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
              {heroLead}
            </p>
          </div>
        </section>
        <main className="p-3 p-md-5 m-md-3 bg-light">
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle-fill"></i> {error}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="directory-page">
      <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">
            Members
          </h1>
          <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
            {heroLead}
          </p>
        </div>
      </section>

      <main className="p-3 p-md-5 m-md-3 bg-light">
        <div className="directory-toolbar mb-4">
          <ul className="nav nav-tabs directory-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link ${activeTab === 'leadership' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'leadership'}
                onClick={() => handleTabChange('leadership')}
              >
                Leadership
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link ${activeTab === 'directory' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'directory'}
                onClick={() => handleTabChange('directory')}
              >
                Directory
              </button>
            </li>
          </ul>
          <input
            type="search"
            className="form-control directory-search"
            placeholder={
              activeTab === 'leadership'
                ? 'Search leadership, team leads, or mentors…'
                : 'Search by name, school, or location…'
            }
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {loading ? (
          <div className="directory-loading py-5">
            <div
              className="spinner-border text-secondary"
              role="status"
              style={{ width: '3rem', height: '3rem' }}
            >
              <span className="visually-hidden">Loading…</span>
            </div>
            <p className="text-muted mb-0">Loading…</p>
          </div>
        ) : activeTab === 'leadership' ? (
          <div className="animate__animated animate__fadeIn">
            <DirectoryPeopleGrid
              title="Executive Directors"
              subtitle="SPAN’s executive leadership."
              headingId="executive-directors-heading"
              people={leadershipExecutives}
              emptyMessage={
                debouncedSearch
                  ? `No executive directors match “${debouncedSearch}”.`
                  : 'No executive directors to display yet.'
              }
            />
            <DirectoryPeopleGrid
              title="Team & Division Leads"
              subtitle="Members who lead SPAN teams, committees, and divisions."
              headingId="team-division-leads-heading"
              people={leadershipDivisionLeads}
              emptyMessage={
                debouncedSearch
                  ? `No team or division leads match “${debouncedSearch}”.`
                  : 'Team and division leads will appear here when roles or team assignments are set.'
              }
            />
            <DirectoryPeopleGrid
              title="Board of Mentors"
              subtitle="Healthcare and industry leaders who mentor SPAN."
              headingId="board-of-mentors-heading"
              people={leadershipMentors}
              emptyMessage={
                debouncedSearch
                  ? `No mentors match “${debouncedSearch}”.`
                  : 'Board of Mentors members will appear here soon.'
              }
            />
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table
                className="animate__animated animate__fadeIn table table-striped table-hover align-middle"
                style={{ minWidth: '600px' }}
              >
                <thead className="bg-white text-dark">
                  <tr>
                    <th>
                      <span>Name</span>
                      <button
                        className="btn btn-sm p-0 ms-2 sort-btn"
                        onClick={() => handleSort('name')}
                        style={{ color: sortKey === 'name' ? '#0d6efd' : '#777' }}
                      >
                        {getSortIcon('name')}
                      </button>
                    </th>
                    <th>
                      <span>Location</span>
                      <button
                        className="btn btn-sm p-0 ms-2 sort-btn"
                        onClick={() => handleSort('location')}
                        style={{ color: sortKey === 'location' ? '#0d6efd' : '#777' }}
                      >
                        {getSortIcon('location')}
                      </button>
                    </th>
                    <th>Email</th>
                    <th>
                      <span>Role</span>
                      <button
                        className="btn btn-sm p-0 ms-2 sort-btn"
                        onClick={() => handleSort('role')}
                        style={{ color: sortKey === 'role' ? '#0d6efd' : '#777' }}
                      >
                        {getSortIcon('role')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-4">
                        {debouncedSearch
                          ? `No results found for "${debouncedSearch}"`
                          : 'No members available.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map((member) => (
                      <tr key={member.memberId || member.email}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={`https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${member.image}`}
                              alt={member.name}
                              width="32"
                              height="32"
                              className="rounded-circle object-fit-cover"
                            />
                            {member.name}
                          </div>
                        </td>
                        <td>{member.location}</td>
                        <td>
                          {member.email && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-dark"
                              onClick={() => handleDirectoryEmailClick(member)}
                            >
                              <i className="bi bi-envelope"></i> Email
                            </button>
                          )}
                        </td>
                        <td>{member.role}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-3 d-flex justify-content-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </main>

      <DirectoryEmailGateModal
        open={!!emailGate}
        recipientName={emailGate?.name}
        recipientEmail={emailGate?.email}
        siteKey={TURNSTILE_SITE_KEY}
        onClose={() => setEmailGate(null)}
      />
    </div>
  )
}

export default DirectoryPage
