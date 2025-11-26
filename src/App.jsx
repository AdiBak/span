import React, { lazy, Suspense } from 'react'
import './App.css'

// Lazy load heavy components for better initial load performance
const BillsPage = lazy(() => import('./pages/BillsPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const DirectoryPage = lazy(() => import('./pages/DirectoryPage'))
const OurStoryPage = lazy(() => import('./pages/OurStoryPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BillsPreview = lazy(() => import('./components/BillsPreview'))
const BillsStats = lazy(() => import('./components/BillsStats'))

// Loading fallback component
const LoadingFallback = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
)

function App({ page }) {
  if (page === 'home') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <HomePage />
      </Suspense>
    )
  }

  if (page === 'bills') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <BillsPage />
      </Suspense>
    )
  }

  if (page === 'blog') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <BlogPage />
      </Suspense>
    )
  }

  if (page === 'directory') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <DirectoryPage />
      </Suspense>
    )
  }

  if (page === 'our-story') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OurStoryPage />
      </Suspense>
    )
  }

  if (page === 'login') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginPage />
      </Suspense>
    )
  }

  if (page === 'dashboard') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <DashboardPage />
      </Suspense>
    )
  }

  if (page === 'bills-preview') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <BillsPreview />
      </Suspense>
    )
  }

  if (page === 'bills-stats') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <BillsStats />
      </Suspense>
    )
  }

  return null
}

export default App

