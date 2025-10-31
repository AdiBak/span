import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Pagination from '../components/Pagination'
import './DirectoryPage.css'

const ITEMS_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

const STATE_ABBR_TO_FULL_NAME = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia"
}

function DirectoryPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [error, setError] = useState(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimeoutRef = useRef(null)

  // Initialize search from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const search = params.get('search')
    if (search) {
      setSearchQuery(search)
      setDebouncedSearch(search)
    }
  }, [])

  // Fetch members on mount
  useEffect(() => {
    fetchMembers()
  }, [])

  // Debounce search input
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

  // Update URL when debounced search changes
  useEffect(() => {
    const url = new URL(window.location)
    if (debouncedSearch.trim()) {
      url.searchParams.set('search', debouncedSearch)
    } else {
      url.searchParams.delete('search')
    }
    window.history.pushState({}, '', url)
  }, [debouncedSearch])

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const search = params.get('search') || ''
      setSearchQuery(search)
      setDebouncedSearch(search)
      setCurrentPage(1)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  async function fetchMembers() {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('active', true)

      if (fetchError) throw fetchError

      const processedMembers = (data || []).map(m => {
        const firstName = (m.first_name || '').trim()
        const lastName = (m.last_name || '').trim()
        return {
          firstName,
          lastName,
          name: (firstName || lastName) ? `${firstName} ${lastName}`.trim() : m.email || '',
          school: m.school_name || '',
          city: m.city || '',
          state: m.state || '',
          location: (m.city && m.state) ? `${m.city}, ${m.state}` : (m.city || m.state || ''),
          email: m.email || '',
          role: m.role || '',
          image: m.image || 'default.jpg'
        }
      })

      // Sort by name initially
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

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = [...members]

    // Apply search filter
    if (debouncedSearch.trim()) {
      const queryLower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(member =>
        ['name', 'school', 'location', 'email', 'role'].some(field =>
          (member[field] || '').toLowerCase().includes(queryLower)
        )
      )
    }

    // Apply sorting
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

  // Paginate filtered members
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

  function handlePageChange(page) {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function getSortIcon(key) {
    if (sortKey !== key) {
      return <i className="bi bi-arrow-down-up"></i>
    }
    return sortAsc ? <i className="bi bi-arrow-up"></i> : <i className="bi bi-arrow-down"></i>
  }

  function getStateFlagSrc(state) {
    const fullState = STATE_ABBR_TO_FULL_NAME[(state || '').toUpperCase()] || ''
    return fullState ? `/assets/images/states/${fullState}.svg` : null
  }

  if (loading) {
    return (
      <div className="directory-page">
        <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
          <div className="parallax-bg" aria-hidden="true"></div>
          <div className="container position-relative z-1">
            <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">Directory</h1>
            <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
              Meet our network of student advocates across the nation.
            </p>
          </div>
        </section>
        <main className="p-3 p-md-5 m-md-3 bg-light">
          <div className="text-center my-5 py-5">
            <div className="spinner-border text-secondary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading directory...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="directory-page">
        <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
          <div className="parallax-bg" aria-hidden="true"></div>
          <div className="container position-relative z-1">
            <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">Directory</h1>
            <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
              Meet our network of student advocates across the nation.
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
          <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">Directory</h1>
          <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
            Meet our network of student advocates across the nation.
          </p>
        </div>
      </section>

      <main className="p-3 p-md-5 m-md-3 bg-light">
        <div className="mb-4 d-flex justify-content-end">
          <input
            type="search"
            className="form-control"
            placeholder="Search by name, school, or location..."
            style={{ maxWidth: '400px' }}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="table-responsive">
          <table className="animate__animated animate__fadeIn table table-striped table-hover align-middle" style={{ minWidth: '600px' }}>
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
                    {debouncedSearch ? `No results found for "${debouncedSearch}"` : 'No members available.'}
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member, idx) => {
                  const stateFlagSrc = getStateFlagSrc(member.state)
                  const fullState = STATE_ABBR_TO_FULL_NAME[(member.state || '').toUpperCase()] || ''
                  
                  return (
                    <tr key={idx}>
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
                      <td>
                        {stateFlagSrc && (
                          <img
                            src={stateFlagSrc}
                            height="18"
                            style={{ marginRight: '6px' }}
                            alt={fullState ? `${fullState} flag` : 'Location'}
                          />
                        )}
                        {member.location}
                      </td>
                      <td>
                        {member.email && (
                          <a href={`mailto:${member.email}`} className="btn btn-sm btn-outline-dark">
                            <i className="bi bi-envelope"></i> Email
                          </a>
                        )}
                      </td>
                      <td>{member.role}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 d-flex justify-content-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </main>
    </div>
  )
}

export default DirectoryPage
