import React, { useEffect } from 'react'
import { setPageSeo } from '../lib/documentSeo'
import './OurStoryPage.css'

function OurStoryPage() {
  // Initialize AOS animations early, before content renders
  useEffect(() => {
    // Initialize AOS immediately if available, or wait for it to load
    const initAOS = () => {
      if (window.AOS && typeof window.AOS.init === 'function') {
        window.AOS.init({
          duration: 1000,
          once: false,
          mirror: false
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
      // Wait for AOS to load
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
    setPageSeo({
      title: 'Our Story | SPAN - Students for Patient Advocacy Nationwide',
      description:
        'SPAN is a student-powered healthcare advocacy organization founded in 2025. Learn our origins, policy work, impact engaging 1,500+ lawmakers, and how students get involved.',
      canonicalPath: '/our-story.html',
      image: '/images/index/preview.jpg',
      type: 'website',
      jsonLdId: 'span-our-story-jsonld',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'Our Story | SPAN',
        url: 'https://spanationwide.org/our-story.html',
        description:
          'Origins, activities, and impact of Students for Patient Advocacy Nationwide (SPAN).',
        isPartOf: {
          '@type': 'WebSite',
          name: 'SPAN',
          url: 'https://spanationwide.org',
        },
      },
    })
  }, [])

  return (
    <div className="our-story-page">
      <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">Our Story</h1>
          <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
            Origins, impact, and how students join SPAN.
          </p>
        </div>
      </section>

      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <h2 className="h3 mb-3">Origins</h2>
            <p className="lead mb-4">
              At Students for Patient Advocacy Nationwide (SPAN), we believe the
              voices of tomorrow&apos;s healthcare leaders must be heard today.
              Founded in response to a direct threat to medical student rights, SPAN
              has grown into a powerful coalition representing students across the
              country.
            </p>
            <p className="lead mb-4">
              In early 2025, Texas House Bill 5294 proposed eliminating the
              pass/fail grading system at Texas medical schools, a policy that
              protects students from undue stress and preserves fair academic
              evaluation. This bill jeopardized the futures of countless medical
              students and sparked a nationwide call to action.
            </p>
            <p className="lead mb-5">
              SPAN quickly mobilized. We united students from institutions including
              UTMB and Baylor College of Medicine, rallying over 100 student advocates
              to directly engage with legislators and policymakers. Our coalition
              placed hundreds of calls, sent testimonies, and amplified student voices
              in the halls of government. Thanks to these coordinated efforts, the bill
              was ultimately stopped, preserving the pass/fail system and protecting
              student futures.
            </p>

            <h2 className="h3 mb-3">Activities and impact</h2>
            <p className="lead mb-4">
              SPAN trains high school and college students to research legislation,
              draft policy language, deliver public testimony, and meet with lawmakers.
              Our members work on healthcare bills at the local, state, and federal
              levels — tracked publicly on our{' '}
              <a href="/bills.html">bills page</a> — and publish policy writing on the{' '}
              <a href="/blog.html">SPAN blog</a>.
            </p>
            <ul className="lead mb-5">
              <li className="mb-2">
                <strong>Legislative engagement:</strong> student advocates research and
                support healthcare policy across states and Congress.
              </li>
              <li className="mb-2">
                <strong>Outreach:</strong> SPAN has engaged <strong>1,500+</strong>{' '}
                lawmakers and officials through calls, testimony, and campaigns.
              </li>
              <li className="mb-2">
                <strong>Network:</strong> a growing national directory of student
                advocates — see our <a href="/directory.html">members</a> and partner
                schools on the home page.
              </li>
            </ul>

            <h2 className="h3 mb-3">Mission</h2>
            <p className="lead mb-4">
              SPAN is more than one campaign. We are committed to democratizing
              healthcare policy advocacy by bridging the gap between students and
              government. Our mission is to empower young advocates to influence
              healthcare legislation so care is more patient-centered, equitable, and
              accessible.
            </p>
            <p className="lead mb-5">
              Today, SPAN continues to grow its network, build strength in numbers,
              and champion patient-centered policies. Official updates and essays live
              on <a href="https://spanationwide.org">spanationwide.org</a> and our
              Medium publication at{' '}
              <a href="https://medium.com/@spanationwide">@spanationwide</a>, mirrored
              on this site so SPAN remains the home for our story.
            </p>

            <h2 className="h3 mb-3">How students get involved</h2>
            <ul className="lead mb-4">
              <li className="mb-2">Research legislation and help shape bill strategy</li>
              <li className="mb-2">Draft policy language, briefs, and public comments</li>
              <li className="mb-2">Organize outreach campaigns and engage lawmakers</li>
              <li className="mb-2">
                Apply on our <a href="/index.html#join">Join</a> form or explore open
                work on the <a href="/bills.html">bills</a> and{' '}
                <a href="/blog.html">blog</a> pages
              </li>
            </ul>
            <p className="lead text-end">&mdash; Vishank, Shayan, Joel, &amp; Ben</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default OurStoryPage
