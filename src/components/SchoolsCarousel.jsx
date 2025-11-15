import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './SchoolsCarousel.css'

function SchoolsCarousel() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const trackRef = useRef(null)

  useEffect(() => {
    fetchSchools()
  }, [])

  // Handle carousel pause on hover
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const handleMouseEnter = () => {
      track.style.animationPlayState = 'paused'
    }

    const handleMouseLeave = () => {
      track.style.animationPlayState = 'running'
    }

    track.addEventListener('mouseenter', handleMouseEnter)
    track.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      track.removeEventListener('mouseenter', handleMouseEnter)
      track.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [schools])

  async function fetchSchools() {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('school_name, school_image')

      if (error) throw error

      const sortedSchools = [...(data || [])].sort((a, b) => a.display_order - b.display_order)
      setSchools(sortedSchools)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch schools from Supabase:', error)
      setLoading(false)
    }
  }

  function handleSchoolClick(schoolName) {
    window.location.href = `/directory.html?search=${encodeURIComponent(schoolName)}`
  }

  function handleKeyDown(e, schoolName) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSchoolClick(schoolName)
    }
  }

  if (loading) {
    return (
      <div className="school-carousel-container position-relative" data-aos="fade" data-aos-duration="1000" data-aos-delay="200">
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  const repeatCount = 4
  const schoolItems = []

  for (let i = 0; i < repeatCount; i++) {
    schools.forEach((school) => {
      schoolItems.push(
        <div key={`${i}-${school.school_name}`} className="school-logo-item">
          <img
            src={`https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/schools-images/${school.school_image}`}
            alt={school.school_name}
            className="school-logo"
            title={`View ${school.school_name} members`}
            loading="lazy"
            onClick={() => handleSchoolClick(school.school_name)}
            onKeyDown={(e) => handleKeyDown(e, school.school_name)}
            tabIndex={0}
            role="button"
            aria-label={`View ${school.school_name} members`}
          />
        </div>
      )
    })
  }

  return (
    <div className="school-carousel-container position-relative" data-aos="fade" data-aos-duration="1000" data-aos-delay="200">
      <div className="school-carousel-track" ref={trackRef}>
        {schoolItems}
      </div>
    </div>
  )
}

export default SchoolsCarousel
