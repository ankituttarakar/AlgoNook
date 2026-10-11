import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import { dark } from '@clerk/themes'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.CLERK_PUBLISHABLE_KEY ||
  ''

function ClerkConfigurationRequired() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <section className="w-full max-w-lg border border-[var(--bb-line)] bg-[var(--bb-panel)] p-6 text-center">
        <p className="font-mono text-sm text-[var(--bb-green)]">AlgoNook</p>
        <h1 className="mt-3 text-lg font-semibold text-[var(--bb-text)]">Authentication is not configured</h1>
        <p className="mt-2 text-sm text-[var(--bb-muted)]">
          Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> for this Vercel environment, then redeploy.
        </p>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {PUBLISHABLE_KEY ? (
        <ClerkProvider
          publishableKey={PUBLISHABLE_KEY}
          appearance={{
            theme: dark,
            variables: {
              colorPrimary: '#00f48e',
              colorBackground: '#0b0f0c',
            },
          }}
        >
          <App />
        </ClerkProvider>
      ) : (
        <ClerkConfigurationRequired />
      )}
    </BrowserRouter>
  </StrictMode>,
)
