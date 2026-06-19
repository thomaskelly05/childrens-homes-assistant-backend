'use client'

import {
  ORB_REQUEST_DEMO_LABEL,
  ORB_REQUEST_DEMO_URL
} from '@/lib/orb/orb-user-facing-names'

type OrbRequestDemoLinkProps = {
  className?: string
  surface?: 'home' | 'guided_demo' | 'login' | 'upgrade'
}

/** Single conversion CTA — one label, one URL across all surfaces. */
export function OrbRequestDemoLink({ className = '', surface = 'home' }: OrbRequestDemoLinkProps) {
  return (
    <a
      href={ORB_REQUEST_DEMO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      data-orb-request-demo
      data-orb-request-demo-surface={surface}
      data-orb-request-demo-url={ORB_REQUEST_DEMO_URL}
    >
      {ORB_REQUEST_DEMO_LABEL}
    </a>
  )
}
