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
      // First, get schools from database (primary source)
      const { data: dbSchools, error: dbError } = await supabase
        .from('schools')
        .select('school_name, school_image, display_order')

      if (dbError) {
        console.error('Failed to fetch schools from database:', dbError)
        setSchools([])
        setLoading(false)
        return
      }

      // Try to list images from storage bucket to find any new images not in database
      let storageFiles = []
      try {
        const { data: files, error: storageError } = await supabase.storage
          .from('schools-images')
          .list('', {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          })
        
        if (!storageError && files) {
          storageFiles = files.filter(file => file.name && !file.name.startsWith('.'))
        }
      } catch (storageErr) {
        // Storage listing failed (likely permissions), but that's okay - we'll use database
        console.warn('Could not list storage files (this is okay if bucket is not publicly listable):', storageErr)
      }

      // Create a map of database schools by image filename
      const dbSchoolMap = new Map()
      const dbImageSet = new Set()
      if (dbSchools) {
        dbSchools.forEach(school => {
          if (school.school_image) {
            dbSchoolMap.set(school.school_image, school)
            dbImageSet.add(school.school_image)
          }
        })
      }

      // Start with database schools
      const allSchools = [...(dbSchools || [])]

      // Add any storage files that aren't in the database
      if (storageFiles.length > 0) {
        storageFiles.forEach(file => {
          if (!dbImageSet.has(file.name)) {
            // Extract school name from filename (remove extension, replace dashes/underscores)
            const schoolName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
            allSchools.push({
              school_name: schoolName,
              school_image: file.name,
              display_order: 999 // New schools go to the end
            })
          }
        })
      }

      // Sort by display_order
      const sortedSchools = allSchools.sort((a, b) => 
        (a.display_order ?? 999) - (b.display_order ?? 999)
      )

      setSchools(sortedSchools)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch schools:', error)
      setLoading(false)
      setSchools([])
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
