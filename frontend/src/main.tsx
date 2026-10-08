import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { TooltipProvider } from './components/ui/tooltip'
import './index.css'

// Font loading handler to prevent flash
document.documentElement.classList.add('font-loading')
document.fonts.ready.then(() => {
  document.documentElement.classList.remove('font-loading')
  document.documentElement.classList.add('font-loaded')
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found in index.html')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {/* BrowserRouter must wrap every component that uses Link /
            useNavigate / Routes, otherwise React Router throws at runtime. */}
        <BrowserRouter>
          <TooltipProvider delayDuration={200}>
            <App />
            <Toaster
              position="bottom-center"
              dir="rtl"
              richColors
              closeButton
              toastOptions={{
                classNames: {
                  toast:
                    'group rounded-2xl border border-border bg-slate-900/90 backdrop-blur-xl text-slate-100 shadow-2xl',
                  description: 'text-slate-300',
                  actionButton: 'bg-brand-600 text-white rounded-lg',
                  cancelButton: 'bg-slate-800 text-slate-200 rounded-lg',
                },
              }}
            />
          </TooltipProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
