import React, { useEffect } from 'react'
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

  return (
    <div className="our-story-page">
      <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">Our Story</h1>
          <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
            SPAN's origin and mission.
          </p>
        </div>
      </section>

      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <p className="lead mb-4">
              At Students for Patient Advocacy Nationwide (SPAN), we believe the
              voices of tomorrow's healthcare leaders must be heard today.
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
            <p className="lead mb-4">
              SPAN quickly mobilized. We united students from institutions including
              UTMB and Baylor College of Medicine, rallying over 100 student advocates
              to directly engage with legislators and policymakers. Our coalition
              placed hundreds of calls, sent testimonies, and amplified student voices
              in the halls of government.
            </p>
            <p className="lead mb-4">
              Thanks to these coordinated efforts, the bill was ultimately stopped,
              preserving the pass/fail system and protecting student futures. This
              victory demonstrated the impact students can have when organized and
              empowered.
            </p>
            <p className="lead mb-4">
              But SPAN is more than just one campaign. We are committed to
              democratizing healthcare policy advocacy by bridging the gap between
              students and government. Our mission is to empower young advocates to
              influence healthcare legislation at local, state, and federal levels.
            </p>
            <p className="lead">
              Today, SPAN continues to grow its network, build strength in numbers,
              and champion patient-centered policies. We invite all students who
              share our passion for equitable, informed healthcare to join us and be
              part of this transformative movement.
            </p>
            <p className="lead text-end">&mdash; Vishank, Shayan, Joel, & Ben</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default OurStoryPage
