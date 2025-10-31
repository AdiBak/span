import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const mountApp = (element, page) => {
  if (!element) return

  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <App page={page} />
    </React.StrictMode>
  )
}

// Mount React apps on their respective pages
mountApp(document.getElementById('bills-root'), 'bills')
mountApp(document.getElementById('blog-root'), 'blog')
mountApp(document.getElementById('directory-root'), 'directory')
mountApp(document.getElementById('bills-preview-root'), 'bills-preview')
mountApp(document.getElementById('bills-stats-root'), 'bills-stats')

