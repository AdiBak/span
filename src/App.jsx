import React from 'react'
import BillsPage from './pages/BillsPage'
import BlogPage from './pages/BlogPage'
import DirectoryPage from './pages/DirectoryPage'
import OurStoryPage from './pages/OurStoryPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import BillsPreview from './components/BillsPreview'
import BillsStats from './components/BillsStats'
import './App.css'

function App({ page }) {
  if (page === 'home') {
    return <HomePage />
  }

  if (page === 'bills') {
    return <BillsPage />
  }

  if (page === 'blog') {
    return <BlogPage />
  }

  if (page === 'directory') {
    return <DirectoryPage />
  }

  if (page === 'our-story') {
    return <OurStoryPage />
  }

  if (page === 'login') {
    return <LoginPage />
  }

  if (page === 'dashboard') {
    return <DashboardPage />
  }

  if (page === 'bills-preview') {
    return <BillsPreview />
  }

  if (page === 'bills-stats') {
    return <BillsStats />
  }

  return null
}

export default App

