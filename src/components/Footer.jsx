import React from 'react'
import './Footer.css'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer text-white py-5">
      <div className="container">
        <div className="row p-3">
          <div className="col-md-6 mb-4 mb-md-0">
            <img
              src="/assets/images/index/logo-wide-light.svg"
              height="40"
              alt="SPAN Logo"
              className="mb-3"
            />
            <p>Students for Patient Advocacy Nationwide - Empowering the next generation of healthcare advocates.</p>
            <div className="mt-3">
              <a
                href="https://www.linkedin.com/company/spanationwide/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white me-2"
              >
                <i className="bi bi-linkedin" style={{ fontSize: '1.5rem' }}></i>
              </a>
              <a
                href="https://www.instagram.com/spanationwide_/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white me-2"
              >
                <i className="bi bi-instagram" style={{ fontSize: '1.5rem' }}></i>
              </a>
              <a
                href="https://www.tiktok.com/@spanationwide"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white"
              >
                <i className="bi bi-tiktok" style={{ fontSize: '1.5rem' }}></i>
              </a>
              <a
                href="https://x.com/spanationwide"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white me-2"
              >
                <i className="bi bi-twitter-x" style={{ fontSize: '1.5rem' }}></i>
              </a>
              <a
                href="https://www.youtube.com/@spanationwide"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white"
              >
                <i className="bi bi-youtube" style={{ fontSize: '1.5rem' }}></i>
              </a>
            </div>
          </div>
          <div className="col-md-6 mb-4 mb-md-0">
            <h5>Quick Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <a href="/index.html" className="text-white text-decoration-none">Home</a>
              </li>
              <li className="mb-2">
                <a href="/our-story.html" className="text-white text-decoration-none">Our Story</a>
              </li>
              <li className="mb-2">
                <a href="/bills.html" className="text-white text-decoration-none">Bills</a>
              </li>
              <li className="mb-2">
                <a href="/directory.html" className="text-white text-decoration-none">Directory</a>
              </li>
              <li className="mb-2">
                <a href="/blog.html" className="text-white text-decoration-none">Blog</a>
              </li>
              {/* <li className="mb-2">
                <a
                  href="https://www.paypal.com/donate/?hosted_button_id=EXAMPLE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white text-decoration-none"
                >
                  Donate
                </a>
              </li> */}
            </ul>
          </div>
        </div>
        <hr className="my-4" />
        <div className="text-center">
          <p className="mb-0">
            © {currentYear} SPAN – Students for Patient Advocacy Nationwide. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
