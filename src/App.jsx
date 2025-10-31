import React from 'react'
import BillsPage from './pages/BillsPage'
import BlogPage from './pages/BlogPage'
import DirectoryPage from './pages/DirectoryPage'
import BillsPreview from './components/BillsPreview'
import BillsStats from './components/BillsStats'
import './App.css'

function App({ page }) {
  if (page === 'bills') {
    return <BillsPage />
  }

  if (page === 'blog') {
    return <BlogPage />
  }

  if (page === 'directory') {
    return <DirectoryPage />
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

