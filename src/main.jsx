console.log('main.jsx: Script loaded')

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import SchoolsCarousel from './components/SchoolsCarousel'
import TeamSection from './components/TeamSection'
import ImpactMap from './components/ImpactMap'
import './index.css'

const mountApp = (element, page) => {
  if (!element) {
    console.log(`mountApp: Element not found for page "${page}"`)
    return
  }
  console.log(`mountApp: Mounting page "${page}" to element`, element)
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

// Wait for DOM to be ready before mounting
function mountComponents() {
  console.log('mountComponents: Starting to mount components')
  console.log('mountComponents: Document ready state:', document.readyState)
  console.log('mountComponents: Current URL:', window.location.href)
  console.log('mountComponents: login-root element:', document.getElementById('login-root'))
  console.log('mountComponents: All elements with id containing "root":', 
    Array.from(document.querySelectorAll('[id*="root"]')).map(el => el.id))
  
  // Mount React apps on their respective pages
  mountApp(document.getElementById('home-root'), 'home')
  mountApp(document.getElementById('bills-root'), 'bills')
  mountApp(document.getElementById('blog-root'), 'blog')
  mountApp(document.getElementById('blog-post-root'), 'blog-post')
  mountApp(document.getElementById('directory-root'), 'directory')
  mountApp(document.getElementById('our-story-root'), 'our-story')
  mountApp(document.getElementById('login-root'), 'login')
  mountApp(document.getElementById('dashboard-root'), 'dashboard')
  mountApp(document.getElementById('bills-preview-root'), 'bills-preview')
  mountApp(document.getElementById('bills-stats-root'), 'bills-stats')

  // Mount Navbar on all pages
  mountNavbar(document.getElementById('navbarContainer'))

  // Mount Footer on all pages
  mountFooter(document.getElementById('footerContainer'))

  // Mount homepage components
  mountComponent(document.getElementById('schools-carousel-root'), SchoolsCarousel)
  mountComponent(document.getElementById('team-section-root'), TeamSection)
  mountComponent(document.getElementById('impact-map-root'), ImpactMap)
}

// Wait for DOM to be ready before mounting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountComponents)
} else {
  // If DOM is already loaded, wait a tiny bit to ensure all elements are available
  setTimeout(mountComponents, 0)
}

