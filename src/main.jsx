import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import SchoolsCarousel from './components/SchoolsCarousel'
import TeamSection from './components/TeamSection'
import './index.css'

const mountApp = (element, page) => {
  if (!element) return

  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <App page={page} />
    </React.StrictMode>
  )
}

const mountFooter = (element) => {
  if (!element) return

  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <Footer />
    </React.StrictMode>
  )
}

const mountNavbar = (element) => {
  if (!element) return

  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <Navbar />
    </React.StrictMode>
  )
}

const mountComponent = (element, Component) => {
  if (!element) return

  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <Component />
    </React.StrictMode>
  )
}

// Mount React apps on their respective pages
mountApp(document.getElementById('bills-root'), 'bills')
mountApp(document.getElementById('blog-root'), 'blog')
mountApp(document.getElementById('directory-root'), 'directory')
mountApp(document.getElementById('our-story-root'), 'our-story')
mountApp(document.getElementById('bills-preview-root'), 'bills-preview')
mountApp(document.getElementById('bills-stats-root'), 'bills-stats')

// Mount Navbar on all pages
mountNavbar(document.getElementById('navbarContainer'))

// Mount Footer on all pages
mountFooter(document.getElementById('footerContainer'))

// Mount homepage components
mountComponent(document.getElementById('schools-carousel-root'), SchoolsCarousel)
mountComponent(document.getElementById('team-section-root'), TeamSection)

