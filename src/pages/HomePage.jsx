import React, { lazy, Suspense } from 'react'
import { usePublicBillImpactStats } from '../components/BillsStats'

const ImpactMap = lazy(() => import('../components/ImpactMap'))
const BillsPreview = lazy(() => import('../components/BillsPreview'))
const PartnersSection = lazy(() => import('../components/PartnersSection'))
const SchoolsCarousel = lazy(() => import('../components/SchoolsCarousel'))
const TeamSection = lazy(() => import('../components/TeamSection'))
const ApplicationForm = lazy(() => import('../components/ApplicationForm'))

function SectionFallback({ label = 'Loading…' }) {
  return (
    <div className="text-center py-4">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">{label}</span>
      </div>
    </div>
  )
}

function HomePage() {
  const impactStats = usePublicBillImpactStats()

  return (
    <>
      {/* Hero Section */}
      <a id="home"></a>
      <section
        className="hero-section position-relative text-center text-white d-flex align-items-center justify-content-center"
        style={{ height: '90vh' }}
        aria-labelledby="home-hero-heading"
      >
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <div className="row justify-content-center">
            <div className="col-lg-9">
              <img
                src="/images/index/logo-wide-light.svg"
                alt="SPAN Logo"
                fetchPriority="high"
                decoding="async"
                onContextMenu={(e) => e.preventDefault()}
                className="img-fluid mb-4"
                data-aos="fade-down"
                data-aos-duration="1000"
                style={{ maxWidth: '80%' }}
                width="900"
                height="225"
              />
              <h1
                id="home-hero-heading"
                className="display-4 fw-bold mb-3"
                data-aos="fade-up"
                data-aos-duration="1000"
              >
                Students for Patient Advocacy Nationwide
              </h1>
              <p
                className="lead mb-4"
                data-aos="fade-up"
                data-aos-duration="1000"
                data-aos-delay="200"
              >
                Empowering the next generation of healthcare advocates.
              </p>
              <div
                className="d-flex flex-wrap justify-content-center gap-3"
                data-aos="fade"
                data-aos-duration="2000"
                data-aos-delay="1000"
              >
                <a href="#join" className="btn btn-outline-light btn-lg px-4 shadow-sm">
                  Join Our Movement
                </a>
                <a href="#impact" className="btn btn-outline-light btn-lg px-4">
                  See Our Impact
                </a>
                <a href="/bills.html?suggest=1" className="btn btn-outline-light btn-lg px-4">
                  Suggest a Bill or Issue
                </a>
              </div>
            </div>
          </div>
        </div>

        <a
          href="#about"
          className="mb-3 scroll-indicator position-absolute bottom-0 start-50 translate-middle-x text-white text-decoration-none"
          aria-label="Scroll to About section"
        >
          <i
            className="bi bi-chevron-down fs-1"
            aria-hidden="true"
            data-aos="fade-up"
            data-aos-easing="ease-in-out"
            data-aos-duration="1000"
            data-aos-delay="200"
            data-aos-anchor-placement="top-center"
          ></i>
        </a>
      </section>

      {/* About Section */}
      <a id="about"></a>
      <div className="row position-relative overflow-hidden p-3 p-md-5 m-md-3 bg-light">
        <div className="col-sm-6 p-lg-5 my-5" data-aos="fade-right" data-aos-duration="1000">
          <h2 className="h3 text-primary fw-bold">About</h2>
          <img
            className="mb-3"
            src="/images/index/logo-wide-dark.svg"
            alt="SPAN logo dark"
            height="50"
            decoding="async"
          />
          <p className="lead">
            <b>Students for Patient Advocacy Nationwide (SPAN)</b> is a student-led nonprofit that
            organizes students to engage directly in healthcare policy advocacy. Founded in response
            to a Texas bill that threatened medical education standards, SPAN brings together high
            school, undergraduate, and medical students to research legislation and communicate with
            state and federal lawmakers. Members have worked on healthcare bills in multiple state
            legislatures and in Congress: supporting, amending, and opposing proposals with direct
            implications for patient care. Through this work, SPAN empowers tomorrow&apos;s
            healthcare advocates to fight for patients today.
          </p>
          <div className="mt-4">
            <a href="#join" className="btn btn-dark">
              Get Involved
            </a>
          </div>
        </div>
        <div
          className="col-sm-6 p-lg-5 my-5 text-center"
          data-aos="fade-left"
          data-aos-duration="1000"
        >
          <div
            className="ratio ratio-16x9 mx-auto shadow rounded-4 overflow-hidden"
            style={{ maxWidth: '720px' }}
          >
            <iframe
              src="https://www.youtube.com/embed/t9-e2QdTz78?si=BEsUERLbWJlZcdGH"
              title="Introducing SPAN."
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            ></iframe>
          </div>
        </div>
      </div>

      {/* Bills Section */}
      <a id="bills"></a>
      <div className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container">
          <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">
            Recent Bills
          </h2>
          <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">
            Explore the legislation we&apos;re tracking right now.
          </p>
          <Suspense fallback={<SectionFallback label="Loading bills…" />}>
            <BillsPreview />
          </Suspense>
          <div
            className="text-center mt-5"
            data-aos="fade"
            data-aos-duration="1000"
            data-aos-delay="500"
          >
            <a href="/bills.html" className="btn btn-dark btn-lg px-5 mb-4">
              <i className="bi bi-file-text" aria-hidden="true"></i> View all Bills
            </a>
          </div>
        </div>
      </div>

      {/* Partners Section */}
      <a id="partners"></a>
      <div className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container">
          <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">
            Our Partners
          </h2>
          <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">
            We&apos;re grateful for the support of our partners in advancing healthcare advocacy.
          </p>
          <Suspense fallback={<SectionFallback label="Loading partners…" />}>
            <PartnersSection />
          </Suspense>
        </div>
      </div>

      {/* Schools Section */}
      <a id="schools"></a>
      <div className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container">
          <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">
            Student Involvement
          </h2>
          <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">
            We&apos;re proud to partner with student advocates from these institutions.
          </p>
          <Suspense fallback={<SectionFallback label="Loading schools…" />}>
            <SchoolsCarousel />
          </Suspense>
        </div>
      </div>

      {/* Impact Section */}
      <a id="impact"></a>
      <section className="py-5 bg-light" aria-labelledby="impact-heading">
        <div className="container">
          <h2
            id="impact-heading"
            className="text-center display-5 fw-bold"
            data-aos="fade"
            data-aos-duration="1000"
          >
            Our Impact
          </h2>
          <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">
            See where SPAN is making a difference.
          </p>

          <div
            className="row justify-content-center"
            data-aos="fade-up"
            data-aos-duration="1000"
            data-aos-delay="200"
          >
            <div className="col-lg-10">
              <Suspense
                fallback={
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading map...</span>
                    </div>
                  </div>
                }
              >
                <ImpactMap />
              </Suspense>
            </div>
          </div>

          <div
            className="row g-4 justify-content-center text-center"
            data-aos="fade-up"
            data-aos-duration="1000"
            data-aos-delay="600"
          >
            <div className="col-sm-6 col-lg-4">
              <div className="impact-card card h-100 border-0 shadow-sm">
                <div className="card-body py-4">
                  <i
                    className="bi bi-file-earmark-text-fill text-primary fs-2 mb-3"
                    aria-hidden="true"
                  ></i>
                  <p className="display-6 fw-bold mb-0" aria-live="polite">
                    {impactStats.proposals == null ? '…' : impactStats.proposals}
                  </p>
                  <p className="lead mb-1">Proposals Submitted</p>
                  <p className="text-muted small">Across local, state, and federal legislation</p>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-4">
              <div className="impact-card card h-100 border-0 shadow-sm">
                <div className="card-body py-4">
                  <i
                    className="bi bi-globe-americas text-success fs-2 mb-3"
                    aria-hidden="true"
                  ></i>
                  <p className="display-6 fw-bold mb-0" aria-live="polite">
                    {impactStats.states == null ? '…' : impactStats.states}
                  </p>
                  <p className="lead mb-1">States Targeted</p>
                  <p className="text-muted small">Active advocacy in growing regional coalitions</p>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-4">
              <div className="impact-card card h-100 border-0 shadow-sm">
                <div className="card-body py-4">
                  <i className="bi bi-people-fill text-danger fs-2 mb-3" aria-hidden="true"></i>
                  <p className="display-6 fw-bold mb-0">1,500+</p>
                  <p className="lead mb-1">Lawmakers Engaged</p>
                  <p className="text-muted small">United voices nationwide for healthcare change</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join Section */}
      <a id="join"></a>
      <div className="row position-relative p-3 p-md-5 m-md-3 bg-light">
        <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">
          Join Our Movement
        </h2>
        <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">
          Ready to make a difference? Learn how you can take the first step with SPAN.
        </p>

        <div
          className="col-md-6 mx-auto align-items-center"
          data-aos="fade-right"
          data-aos-delay="500"
          data-aos-duration="1000"
        >
          <p className="lead mb-5">
            <br />
            <br />
            Members of SPAN gain hands-on experience with policy work, lead national initiatives,
            receive mentorship from professionals, and join a network of ambitious student
            advocates. We&apos;re expanding across the U.S. and looking for dedicated students ready
            to transform the healthcare system.
          </p>
          <div>
            <img
              onContextMenu={(e) => e.preventDefault()}
              loading="lazy"
              className="rounded img-fluid shadow"
              src="/images/index/capitol.jpg"
              alt="Texas Capitol building"
              width="1280"
              height="720"
              decoding="async"
            />
          </div>
        </div>

        <div
          className="col-md-6 mx-auto"
          data-aos="fade-left"
          data-aos-delay="500"
          data-aos-duration="1000"
        >
          <Suspense fallback={<SectionFallback label="Loading application form…" />}>
            <ApplicationForm />
          </Suspense>
        </div>
      </div>

      {/* Team Section */}
      <a id="team"></a>
      <div className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container">
          <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">
            Founding Team
          </h2>
          <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">
            Meet the students who launched SPAN and continue to lead its mission forward.
          </p>

          <Suspense fallback={<SectionFallback label="Loading team…" />}>
            <TeamSection />
          </Suspense>
          <div
            className="text-center mt-5"
            data-aos="fade"
            data-aos-duration="1000"
            data-aos-delay="500"
          >
            <a href="/directory.html" className="btn btn-dark btn-lg px-5 mb-4">
              <i className="bi bi-people-fill" aria-hidden="true"></i> View Members
            </a>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <a id="contact"></a>
      <div className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container">
          <div className="row">
            <div
              className="col-md-6 p-3"
              data-aos="fade-right"
              data-aos-duration="1000"
              data-aos-delay="200"
            >
              <h2 className="display-5 fw-bold">Get in Touch</h2>
              <p className="lead">Have questions or want to get involved? Reach out to us!</p>
              <div className="mt-5">
                <p className="fs-5 mb-0">
                  <i className="bi bi-envelope-fill me-2 text-primary" aria-hidden="true"></i>{' '}
                  <a
                    className="link-dark"
                    href="mailto:contact@spanationwide.org"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    contact@spanationwide.org
                  </a>
                </p>
                <p className="fs-5 mt-3 mb-0">
                  <i className="bi bi-geo-alt-fill me-2 text-primary" aria-hidden="true"></i>{' '}
                  National Headquarters:
                  <br />
                  <br />
                  1702 Clifton Road Suite 1650
                  <br />
                  Atlanta, GA 30322
                </p>
              </div>
            </div>
            <div
              className="col-md-6 p-3"
              data-aos="fade-left"
              data-aos-duration="1000"
              data-aos-delay="200"
            >
              <form action="https://formspree.io/f/myzjdqab" method="POST">
                <div className="mb-3">
                  <label htmlFor="contact-name" className="form-label">
                    Your Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="contact-name"
                    name="name"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="contact-email" className="form-label">
                    Your Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="contact-email"
                    name="email"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="contact-message" className="form-label">
                    Your Message
                  </label>
                  <textarea
                    className="form-control"
                    id="contact-message"
                    name="message"
                    rows="4"
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-dark">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default HomePage
