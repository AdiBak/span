import React from 'react'
import BillsPreview from '../components/BillsPreview'
import SchoolsCarousel from '../components/SchoolsCarousel'
import TeamSection from '../components/TeamSection'
import ImpactMap from '../components/ImpactMap'
import BillsStats from '../components/BillsStats'
import ApplicationForm from '../components/ApplicationForm'

function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <a id="home"></a>
      <section className="hero-section position-relative text-center text-white d-flex align-items-center justify-content-center"
        style={{ height: '90vh' }}>
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <div className="row justify-content-center">
            <div className="col-lg-9">
              <img src="/images/index/logo-wide-light.svg"
                alt="SPAN Logo"
                loading="lazy"
                decoding="async"
                onContextMenu={(e) => e.preventDefault()}
                className="img-fluid mb-4"
                data-aos="fade-down"
                data-aos-duration="1000"
                style={{ maxWidth: '80%' }}
                width="900" height="225" />
              <h1 className="display-4 fw-bold mb-3" data-aos="fade-up" data-aos-duration="1000">Students for Patient Advocacy Nationwide</h1>
              <p className="lead mb-4" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
                Empowering the next generation of healthcare advocates.
              </p>
              <div className="d-flex flex-wrap justify-content-center gap-3" data-aos="fade" data-aos-duration="2000" data-aos-delay="1000">
                <a href="#join" className="btn btn-outline-light btn-lg px-4 shadow-sm">Join Our Movement</a>
                <a href="#impact" className="btn btn-outline-light btn-lg px-4">See Our Impact</a>
              </div>
            </div>
          </div>
        </div>

        {/* Chevron Scroll Indicator */}
        <a href="#about" className="mb-3 scroll-indicator position-absolute bottom-0 start-50 translate-middle-x text-white text-decoration-none">
          <i className="bi bi-chevron-down fs-1"
            data-aos="fade-up"
            data-aos-easing="ease-in-out"
            data-aos-duration="1000"
            data-aos-delay="200"
            data-aos-anchor-placement="top-center"></i>
        </a>
      </section>

      {/* About Section */}
      <a id="about"></a>
      <div className="row position-relative overflow-hidden p-3 p-md-5 m-md-3 bg-light">
        <div className="col-sm-6 p-lg-5 my-5" data-aos="fade-right" data-aos-duration="1000">
          <h3 className="text-primary fw-bold">About</h3>
          <img className="mb-3" src="/images/index/logo-wide-dark.svg" alt="SPAN logo dark" height="50" decoding="async" />
          <p className="lead">
            <b>Students for Patient Advocacy Nationwide (SPAN)</b> is a national, student-led coalition focused on advocating for patient-centered healthcare reform. The
            organization empowers high-school and college students who are passionate about the intersection of medicine
            and public policy. Through grassroots organizing, legislative advocacy, nonprofit partnerships, and
            educational outreach, SPAN aims to improve healthcare access, protect patient rights, and advance issues
            like mental health, reproductive justice, and disability equity.
          </p>
          <div className="mt-4">
            <a href="#impact" className="btn btn-outline-dark me-2">See Our Impact</a>
            <a href="#join" className="btn btn-dark">Get Involved</a>
          </div>
        </div>
        <div className="col-sm-6 p-lg-5 my-5 text-center" data-aos="fade-left" data-aos-duration="1000">
          <div className="ratio ratio-16x9 mx-auto shadow rounded-4 overflow-hidden" style={{ maxWidth: '720px' }}>
            <iframe src="https://www.youtube.com/embed/t9-e2QdTz78?si=BEsUERLbWJlZcdGH" title="Introducing SPAN."
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"></iframe>
          </div>
        </div>
      </div>

      {/* Bills Section */}
      <a id="bills"></a>
      <div className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container">
          <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">Recent Bills</h2>
          <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">Explore the legislation we're tracking right now.</p>
          <BillsPreview />
          <div className="text-center mt-5" data-aos="fade" data-aos-duration="1000" data-aos-delay="500">
            <a href="/bills.html" className="btn btn-dark btn-lg px-5 mb-4"><i className="bi bi-file-text"></i> View all Bills</a>
          </div>
        </div>
      </div>

      {/* Schools Section */}
      <a id="schools"></a>
      <div className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container">
          <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">Student Involvement</h2>
          <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">We're proud to partner with student advocates from these institutions.</p>
          <SchoolsCarousel />
        </div>
      </div>

      {/* Impact Section */}
      <a id="impact"></a>
      <section className="py-5 bg-light">
        <div className="container">
          <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">Our Impact</h2>
          <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">See where SPAN is making a difference.</p>

          {/* Map Section */}
          <div className="row justify-content-center" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
            <div className="col-lg-10">
              <ImpactMap />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row g-4 justify-content-center text-center" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="600">
            <div className="col-sm-6 col-lg-4">
              <div className="impact-card card h-100 border-0 shadow-sm">
                <div className="card-body py-4">
                  <i className="bi bi-file-earmark-text-fill text-primary fs-2 mb-3"></i>
                  <h3 id="proposals"></h3>
                  <p className="lead mb-1">Proposals Submitted</p>
                  <p className="text-muted small">Across local, state, and federal legislation</p>
                  <BillsStats />
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-4">
              <div className="impact-card card h-100 border-0 shadow-sm">
                <div className="card-body py-4">
                  <i className="bi bi-globe-americas text-success fs-2 mb-3"></i>
                  <h3 id="statesTargeted"></h3>
                  <p className="lead mb-1">States Targeted</p>
                  <p className="text-muted small">Active advocacy in growing regional coalitions</p>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-4">
              <div className="impact-card card h-100 border-0 shadow-sm">
                <div className="card-body py-4">
                  <i className="bi bi-people-fill text-danger fs-2 mb-3"></i>
                  <h3>1,500+</h3>
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
        <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">Join Our Movement</h2>
        <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">Ready to make a difference? Learn how you can take the first step with SPAN.</p>

        <div className="col-md-6 mx-auto align-items-center" data-aos="fade-right" data-aos-delay="500" data-aos-duration="1000">
          <p className="lead mb-5"><br /><br />Members of SPAN gain hands-on experience with policy work, lead national
            initiatives, receive mentorship from professionals, and join a network of ambitious student advocates. We're
            expanding across the U.S. and looking for dedicated students ready to transform the healthcare system.</p>
          <div>
            <img onContextMenu={(e) => e.preventDefault()} loading="lazy" className="rounded img-fluid shadow"
              src="/images/index/capitol.jpg" alt="Texas Capitol building" width="1280" height="720" decoding="async" />
          </div>
        </div>

        <div className="col-md-6 mx-auto" data-aos="fade-left" data-aos-delay="500" data-aos-duration="1000">
          <ApplicationForm />
        </div>
      </div>

      {/* Team Section */}
      <a id="team"></a>
      <div className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container">
          <h2 className="text-center display-5 fw-bold" data-aos="fade" data-aos-duration="1000">Founding Team</h2>
          <p className="lead text-center mb-5" data-aos="fade" data-aos-duration="1000">Meet the students who launched SPAN and continue to lead its mission forward.</p>

          <TeamSection />
          <div className="text-center mt-5" data-aos="fade" data-aos-duration="1000" data-aos-delay="500">
            <a href="/directory.html" className="btn btn-dark btn-lg px-5 mb-4"><i className="bi bi-people-fill"></i> View
              Directory</a>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <a id="contact"></a>
      <div className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container">
          <div className="row">
            <div className="col-md-6 p-3" data-aos="fade-right" data-aos-duration="1000" data-aos-delay="200">
              <h2 className="display-5 fw-bold">Get in Touch</h2>
              <p className="lead">Have questions or want to get involved? Reach out to us!</p>
              <div className="mt-5">
                <h5><i className="bi bi-envelope-fill me-2 text-primary"></i> <a className="link-dark"
                  href="mailto:contact@spanationwide.org" target="_blank" rel="noopener noreferrer">contact@spanationwide.org</a></h5>
                <h5 className="mt-3"><i className="bi bi-geo-alt-fill me-2 text-primary"></i> National
                  Headquarters:<br /><br />1702 Clifton Road Suite 1650<br />Atlanta, GA 30322</h5>
              </div>
            </div>
            <div className="col-md-6 p-3" data-aos="fade-left" data-aos-duration="1000" data-aos-delay="200">
              <form action="https://formspree.io/f/myzjdqab" method="POST">
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Your Name</label>
                  <input type="text" className="form-control" id="name" name="name" required />
                </div>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Your Email</label>
                  <input type="email" className="form-control" id="email" name="email" required />
                </div>
                <div className="mb-3">
                  <label htmlFor="message" className="form-label">Your Message</label>
                  <textarea className="form-control" id="message" name="message" rows="4" required></textarea>
                </div>
                <button type="submit" className="btn btn-dark">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default HomePage

