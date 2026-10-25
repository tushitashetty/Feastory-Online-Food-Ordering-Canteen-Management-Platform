import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './styles/style.css'      // original Feastory stylesheet, untouched
import './styles/additions.css'  // small extras for the new features

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
