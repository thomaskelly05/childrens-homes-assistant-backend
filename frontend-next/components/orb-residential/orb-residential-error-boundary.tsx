'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import Link from 'next/link'

import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'

type Props = {
  children: ReactNode
  /** When true, show residential dark recovery UI (default). */
  residential?: boolean
}

type State = {
  error: Error | null
}

export class OrbResidentialErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ORB Residential] render error', error, info.componentStack)
  }

  private reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const developerMode = isOrbDeveloperMode()
    const residential = this.props.residential !== false

    return (
      <div
        className={
          residential
            ? 'orb-residential-root flex min-h-[100dvh] items-center justify-center bg-[#05070d] px-6 py-10 text-[#f7faff]'
            : 'flex min-h-[100dvh] items-center justify-center bg-[#05070d] px-6 py-10 text-[#f7faff]'
        }
        data-orb-residential-error
        role="alert"
      >
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <h1 className="text-xl font-semibold tracking-tight text-[#f7faff]">Something went wrong</h1>
          <p className="mt-3 text-sm leading-7 text-[#a7aebd]">
            ORB could not load this workspace properly. You can start a new chat or return to ORB.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/orb"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950"
              data-orb-error-start-chat
              onClick={this.reset}
            >
              Start new chat
            </Link>
            <Link
              href="/orb"
              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-[#f7faff]"
              data-orb-error-back
            >
              Back to ORB
            </Link>
          </div>
          {developerMode ? (
            <p
              className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 font-mono text-[11px] leading-5 text-red-200"
              data-orb-error-developer-detail
            >
              {error.message}
            </p>
          ) : null}
        </div>
      </div>
    )
  }
}
