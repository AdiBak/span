import React, { useState, useEffect } from 'react'
import { fetchPublicDirectoryMembers } from '../lib/publicData'
import { memberSiteDisplayName } from '../lib/memberDisplayName'

const IMAGE_BASE_URL = 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images'

function TeamSection() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    try {
      const data = await fetchPublicDirectoryMembers({
        requireRegistration: true,
        role: 'Executive Director',
      })
      setMembers((data || []).slice(0, 4))
      setLoading(false)
    } catch (error) {
      console.error('Error fetching Executive Directors:', error)
      setLoading(false)
    }
  }

  function handleAboutClick(member) {
    setSelectedMember(member)
  }

  // Update modal content when selectedMember changes
  useEffect(() => {
    if (selectedMember) {
      const imageEl = document.getElementById('bioModalImage')
      const labelEl = document.getElementById('bioModalLabel')
      const subLabelEl = document.getElementById('bioModalSubLabel')
      const bodyEl = document.getElementById('bioModalBody')
      const emailBtn = document.getElementById('bioModalEmail')

      if (imageEl) {
        imageEl.src = `${IMAGE_BASE_URL}/${selectedMember.image}`
      }
      if (labelEl) {
        labelEl.textContent = memberSiteDisplayName(selectedMember)
      }
      if (subLabelEl) {
        subLabelEl.textContent = `${selectedMember.role} • ${selectedMember.city}, ${selectedMember.state}`
      }
      if (bodyEl) {
        bodyEl.innerHTML = `<p>${selectedMember.bio || 'No bio available.'}</p>`
      }
      if (emailBtn) {
        emailBtn.href = `mailto:${selectedMember.email}`
        emailBtn.innerHTML = `<i class="bi bi-envelope"></i> Email ${memberSiteDisplayName(selectedMember).split(' ')[0] || 'member'}`
      }
    }
  }, [selectedMember])

  if (loading) {
    return (
      <div className="mt-5 row g-4 justify-content-center" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mt-5 row g-4 justify-content-center" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
        {members.map((member, index) => (
          <div key={index} className="col-md-4 col-lg-3">
            <div className="impact-card card h-100 border-0 shadow-sm text-center">
              <img
                src={`${IMAGE_BASE_URL}/${member.image}`}
                className="rounded-circle object-fit-cover d-block mx-auto mt-4"
                alt={memberSiteDisplayName(member)}
                style={{ width: '75%', aspectRatio: '1 / 1' }}
              />
              <div className="card-body d-flex flex-column justify-content-between">
                <div>
                  <h5 className="card-title">{memberSiteDisplayName(member)}</h5>
                  <p className="card-text text-muted">
                    {member.role}<br />{member.city}, {member.state}
                  </p>
                </div>
                <div className="btn-group mt-3" role="group">
                  <button
                    className="btn btn-outline-dark btn-sm w-50"
                    onClick={() => handleAboutClick(member)}
                    data-bs-toggle="modal"
                    data-bs-target="#bioModal"
                    type="button"
                  >
                    <i className="bi bi-person-lines-fill"></i> About
                  </button>
                  <a href={`mailto:${member.email}`} className="btn btn-outline-dark btn-sm w-50">
                    <i className="bi bi-envelope"></i> Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default TeamSection
