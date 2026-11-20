import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import ThemeProvider from './context/ThemeProvider'
import AuthProvider from './context/AuthProvider'
import WorkspaceProvider from './context/WorkspaceProvider'
import ConfirmProvider from './context/ConfirmProvider'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <ConfirmProvider>
              <App />
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 3500,
                  style: {
                    background: 'var(--card)',
                    color: 'var(--fg)',
                    border: '1px solid var(--line-strong)',
                    fontSize: '13px',
                  },
                }}
              />
            </ConfirmProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
