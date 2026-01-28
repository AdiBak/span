import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './PartnersCarousel.css'

const PARTNERS_IMAGE_BASE_URL = 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/partners-images'

function PartnersCarousel() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const trackRef = useRef(null)

  useEffect(() => {
    fetchPartners()
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
  }, [partners])

  async function fetchPartners() {
    try {
      // Fetch partners from database
      const { data: dbPartners, error } = await supabase
        .from('partners')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('Failed to fetch partners from database:', error)
        setPartners([])
        setLoading(false)
        return
      }

      setPartners(dbPartners || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch partners:', error)
      setLoading(false)
      setPartners([])
    }
  }

  if (loading) {
    return (
      <div className="partner-carousel-container position-relative" data-aos="fade" data-aos-duration="1000" data-aos-delay="200">
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  // If no partners in database, show fallback (hardcoded 3)
  if (partners.length === 0) {
    const fallbackPartners = [
      { name: 'Beyond Partisan', logo: '/images/misc/beyond-partisan-logo.png', url: 'https://beyondpartisan.org/' },
      { name: 'Unite America', logo: '/images/misc/unite-america-logo.png', url: 'https://www.uniteamerica.org/' },
      { name: 'Stanford Deliberative Democracy Lab', logo: '/images/misc/stanford-ddl-logo.png', url: 'https://deliberation.stanford.edu/' }
    ]

    return (
      <div className="partner-carousel-container position-relative" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
        <div className="row justify-content-center align-items-center g-4">
          {fallbackPartners.map((partner, idx) => (
            <div key={idx} className="col-md-4 col-sm-6 text-center">
              {partner.url ? (
                <a href={partner.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                  <img 
                    src={partner.logo} 
                    alt={partner.name} 
                    className="img-fluid partner-logo"
                    style={{ maxHeight: '80px', objectFit: 'contain' }}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              ) : (
                <img 
                  src={partner.logo} 
                  alt={partner.name} 
                  className="img-fluid partner-logo"
                  style={{ maxHeight: '120px', objectFit: 'contain' }}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // If 3 or fewer partners, show in static grid (no carousel)
  if (partners.length <= 3) {
    return (
      <div className="partner-carousel-container position-relative" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
        <div className="row justify-content-center align-items-center g-4">
          {partners.map((partner) => (
            <div key={partner.partner_id} className="col-md-4 col-sm-6 text-center">
              {partner.website_url ? (
                <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                  <img 
                    src={`${PARTNERS_IMAGE_BASE_URL}/${partner.partner_logo}`}
                    alt={partner.partner_name} 
                    className="img-fluid partner-logo"
                    style={{ maxHeight: '80px', objectFit: 'contain' }}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              ) : (
                <img 
                  src={`${PARTNERS_IMAGE_BASE_URL}/${partner.partner_logo}`}
                  alt={partner.partner_name} 
                  className="img-fluid partner-logo"
                  style={{ maxHeight: '120px', objectFit: 'contain' }}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // If more than 3 partners, show carousel
  // Create exactly 2 copies for seamless infinite loop
  const repeatCount = 2
  const partnerItems = []

  for (let i = 0; i < repeatCount; i++) {
    partners.forEach((partner) => {
      const logoElement = (
        <img
          src={`${PARTNERS_IMAGE_BASE_URL}/${partner.partner_logo}`}
          alt={partner.partner_name}
          className="partner-logo"
          style={{ maxHeight: '80px', objectFit: 'contain' }}
          loading="lazy"
          decoding="async"
        />
      )

      partnerItems.push(
        <div key={`${i}-${partner.partner_id}`} className="partner-logo-item">
          {partner.website_url ? (
            <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
              {logoElement}
            </a>
          ) : (
            logoElement
          )}
        </div>
      )
    })
  }

  return (
    <div className="partner-carousel-container position-relative" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
      <div className="partner-carousel-track" ref={trackRef}>
        {partnerItems}
      </div>
    </div>
  )
}

export default PartnersCarousel
