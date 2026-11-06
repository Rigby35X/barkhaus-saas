import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './globals.css'
import AuthCheck from './AuthCheck'
createRoot(document.getElementById('root')!).render(<StrictMode><AuthCheck /></StrictMode>)
