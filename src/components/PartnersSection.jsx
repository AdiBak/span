import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PARTNERS_IMAGES_BASE_URL } from '../lib/supabasePublicUrls'
import './PartnersSection.css'

const FALLBACK_PARTNERS = [
  {
    id: 'beyond-partisan',
    name: 'Beyond Partisan',
    logo: '/images/misc/beyond-partisan-logo.png',
    url: 'https://beyondpartisan.org/',
  },
  {
    id: 'unite-america',
    name: 'Unite America',
    logo: '/images/misc/unite-america-logo.png',
    url: 'https://www.uniteamerica.org/',
  },
  {
    id: 'stanford-ddl',
    name: 'Stanford Deliberative Democracy Lab',
    logo: '/images/misc/stanford-ddl-logo.png',
    url: 'https://deliberation.stanford.edu/',
  },
]

function PartnerLogo({ name, logoSrc, url }) {
  const img = (
    <img
      src={logoSrc}
      alt={name}
      className="partner-logo"
      loading="lazy"
      decoding="async"
    />
  )

  if (!url) return <div className="partner-logo-cell">{img}</div>

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="partner-logo-cell text-decoration-none"
      aria-label={`${name} (opens in a new tab)`}
      title={name}
    >
      {img}
    </a>
  )
}

function PartnersSection() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchPartners() {
      try {
        const { data, error } = await supabase
          .from('partners')
          .select('partner_id, partner_name, partner_logo, website_url, display_order, active')
          .eq('active', true)
          .order('display_order', { ascending: true })

        if (cancelled) return
        if (error) {
          console.error('Failed to fetch partners from database:', error)
          setPartners([])
        } else {
          setPartners(data || [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch partners:', err)
          setPartners([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPartners()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="partners-section" data-aos="fade" data-aos-duration="1000" data-aos-delay="200">
        <div className="text-center py-4">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading partners…</span>
          </div>
        </div>
      </div>
    )
  }

  const items =
    partners.length > 0
      ? partners.map((p) => ({
          id: p.partner_id,
          name: p.partner_name,
          logoSrc: `${PARTNERS_IMAGES_BASE_URL}/${p.partner_logo}`,
          url: p.website_url || null,
        }))
      : FALLBACK_PARTNERS.map((p) => ({
          id: p.id,
          name: p.name,
          logoSrc: p.logo,
          url: p.url,
        }))

  return (
    <div
      className="partners-section"
      data-aos="fade-up"
      data-aos-duration="1000"
      data-aos-delay="200"
    >
      <div className="partners-grid" role="list">
        {items.map((partner) => (
          <div key={partner.id} role="listitem">
            <PartnerLogo name={partner.name} logoSrc={partner.logoSrc} url={partner.url} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default PartnersSection
