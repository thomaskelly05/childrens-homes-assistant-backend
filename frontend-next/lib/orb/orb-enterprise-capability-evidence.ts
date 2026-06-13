/**
 * Internal enterprise security/compliance evidence map for ORB.
 * Procurement-ready honesty — not public marketing claims.
 */

export type EnterpriseEvidenceStatus = 'implemented' | 'partial' | 'missing' | 'not_applicable'

export type EnterpriseCapabilityEvidence = {
  id: string
  label: string
  status: EnterpriseEvidenceStatus
  safeToClaimPublicly: boolean
  evidence: string[]
  implementationFiles: string[]
  limitations: string[]
  notes: string[]
}

export const ORB_ENTERPRISE_CAPABILITY_EVIDENCE: EnterpriseCapabilityEvidence[] = [
  {
    id: 'mfa',
    label: 'Multi-factor authentication',
    status: 'implemented',
    safeToClaimPublicly: true,
    evidence: ['TOTP MFA routes', 'Recovery codes', 'MFA enforced for admin/manager roles in OS'],
    implementationFiles: ['routers/mfa_routes.py', 'schemas/mfa.py'],
    limitations: ['ORB standalone MFA policy varies by deployment'],
    notes: ['MFA available — not universally enforced on all ORB paths']
  },
  {
    id: 'sso_oauth',
    label: 'SSO / OAuth sign-in',
    status: 'implemented',
    safeToClaimPublicly: true,
    evidence: ['ORB standalone OAuth (Google/Microsoft)', 'OAuth state validation'],
    implementationFiles: ['routers/orb_oauth_routes.py', 'services/orb_oauth_service.py'],
    limitations: ['Enterprise SAML/SCIM not verified in repo'],
    notes: ['OAuth is not full enterprise SSO federation']
  },
  {
    id: 'passkeys',
    label: 'Passkey / WebAuthn authentication',
    status: 'implemented',
    safeToClaimPublicly: true,
    evidence: ['Passkey registration and authentication routes'],
    implementationFiles: ['routers/passkey_routes.py'],
    limitations: ['Browser/device support varies'],
    notes: []
  },
  {
    id: 'rbac',
    label: 'Role-based access control',
    status: 'implemented',
    safeToClaimPublicly: true,
    evidence: ['policy_engine permissions', 'ORB residential access dependencies', 'require_orb_dictate_access'],
    implementationFiles: ['auth/', 'middleware/access_scope_middleware.py'],
    limitations: ['Tenant RBAC complexity varies between OS and standalone ORB'],
    notes: []
  },
  {
    id: 'encryption_in_transit',
    label: 'Encryption in transit (TLS)',
    status: 'implemented',
    safeToClaimPublicly: true,
    evidence: ['HTTPS deployment', 'PostgreSQL sslmode=require in db/connection.py'],
    implementationFiles: ['db/connection.py', 'deploy/'],
    limitations: ['Local dev may use localhost without TLS'],
    notes: ['Production must terminate TLS at load balancer']
  },
  {
    id: 'encryption_at_rest',
    label: 'Encryption at rest',
    status: 'partial',
    safeToClaimPublicly: false,
    evidence: ['Cloud provider disk encryption assumed'],
    implementationFiles: ['docs/deployment/backup-and-recovery.md'],
    limitations: ['No application-level field encryption documented for all child fields'],
    notes: ['Do not claim government-grade encryption at rest']
  },
  {
    id: 'audit_logs',
    label: 'Audit logging',
    status: 'implemented',
    safeToClaimPublicly: true,
    evidence: ['audit_log table', 'audit_event_service', 'ai_audit_logs', 'roster_audit_log'],
    implementationFiles: [
      'services/audit_event_service.py',
      'services/audit_service.py',
      'services/ai_audit_service.py'
    ],
    limitations: ['ORB standalone telemetry is metadata-only — not full audit trail UI'],
    notes: []
  },
  {
    id: 'data_retention',
    label: 'Data retention policies',
    status: 'partial',
    safeToClaimPublicly: false,
    evidence: ['orb-privacy-content retention summary', 'ai_retention_policy_service'],
    implementationFiles: [
      'frontend-next/lib/orb/privacy/orb-privacy-content.ts',
      'services/ai_retention_policy_service.py'
    ],
    limitations: ['Retention controls being finalised for pilot', 'No automated expiry for saved outputs'],
    notes: ['Honest pilot limitations documented in privacy UI']
  },
  {
    id: 'region_storage',
    label: 'UK / EU data residency',
    status: 'missing',
    safeToClaimPublicly: false,
    evidence: [],
    implementationFiles: [],
    limitations: ['No guaranteed UK-only storage claim in codebase'],
    notes: ['Do not claim UK data storage guaranteed without infrastructure evidence']
  },
  {
    id: 'dpa_dpi',
    label: 'DPA / DPIA documentation',
    status: 'partial',
    safeToClaimPublicly: false,
    evidence: ['Privacy notice pages', 'Data protection schemas'],
    implementationFiles: [
      'frontend-next/app/orb/privacy/page.tsx',
      'schemas/data_protection.py'
    ],
    limitations: ['Formal DPIA pack not in repo', 'DPA templates not verified'],
    notes: ['Procurement may request external legal pack']
  },
  {
    id: 'gdpr_position',
    label: 'GDPR / UK GDPR alignment',
    status: 'partial',
    safeToClaimPublicly: false,
    evidence: ['Privacy requests flow', 'Data minimisation in external AI governance', 'Redaction modes'],
    implementationFiles: [
      'services/ai_external_call_governance.py',
      'frontend-next/app/orb/privacy/requests/page.tsx'
    ],
    limitations: ['Not a compliance certification'],
    notes: ['Describe alignment efforts — not "GDPR certified"']
  },
  {
    id: 'security_headers',
    label: 'Security headers (CSP, nosniff)',
    status: 'implemented',
    safeToClaimPublicly: true,
    evidence: ['security_middleware.py', 'Next.js middleware CSP', 'orb-security-headers-contract tests'],
    implementationFiles: [
      'middleware/security_middleware.py',
      'frontend-next/middleware.ts',
      'docs/orb-security-headers-csp.md'
    ],
    limitations: ['CSP report-only mode in some deployments'],
    notes: []
  },
  {
    id: 'tenant_separation',
    label: 'Tenant / organisation separation',
    status: 'partial',
    safeToClaimPublicly: false,
    evidence: ['User-scoped saved outputs', 'Provider/home scoping in OS'],
    implementationFiles: ['services/orb_saved_output_service.py', 'services/os_scope_service.py'],
    limitations: ['Standalone ORB tenant model differs from full OS'],
    notes: []
  },
  {
    id: 'billing_security_admin',
    label: 'Billing and security admin controls',
    status: 'implemented',
    safeToClaimPublicly: true,
    evidence: ['Stripe integration', 'ORB billing routes', 'Admin user routes'],
    implementationFiles: ['routers/orb_billing_routes.py', 'routers/admin_user_routes.py'],
    limitations: ['Stripe holds card data — not on IndiCare servers'],
    notes: []
  },
  {
    id: 'incident_response',
    label: 'Incident response documentation',
    status: 'missing',
    safeToClaimPublicly: false,
    evidence: [],
    implementationFiles: [],
    limitations: ['No published incident response runbook in repo'],
    notes: ['Internal ops docs may exist outside repo']
  },
  {
    id: 'penetration_testing',
    label: 'Penetration testing status',
    status: 'missing',
    safeToClaimPublicly: false,
    evidence: [],
    implementationFiles: [],
    limitations: ['No verified pen test report referenced in repo'],
    notes: []
  },
  {
    id: 'backups_recovery',
    label: 'Backups and recovery',
    status: 'partial',
    safeToClaimPublicly: false,
    evidence: ['docs/deployment/backup-and-recovery.md'],
    implementationFiles: ['docs/deployment/backup-and-recovery.md'],
    limitations: ['ORB standalone backup scope not fully documented'],
    notes: []
  },
  {
    id: 'hipaa',
    label: 'HIPAA compliance',
    status: 'not_applicable',
    safeToClaimPublicly: false,
    evidence: [],
    implementationFiles: [],
    limitations: ['UK children homes context — HIPAA not applicable'],
    notes: ['Never claim HIPAA compliant']
  },
  {
    id: 'iso_soc2',
    label: 'ISO 27001 / SOC 2 certification',
    status: 'missing',
    safeToClaimPublicly: false,
    evidence: [],
    implementationFiles: [],
    limitations: ['No certification in repo'],
    notes: []
  }
]

export function getEnterpriseEvidence(id: string): EnterpriseCapabilityEvidence | undefined {
  return ORB_ENTERPRISE_CAPABILITY_EVIDENCE.find((e) => e.id === id)
}

export function validateEnterpriseEvidenceTruthfulness(): string[] {
  const violations: string[] = []
  const neverPublic = ['hipaa', 'iso_soc2', 'region_storage', 'penetration_testing']

  for (const item of ORB_ENTERPRISE_CAPABILITY_EVIDENCE) {
    if (item.status === 'missing' && item.safeToClaimPublicly) {
      violations.push(`${item.id}: missing evidence cannot be safeToClaimPublicly`)
    }
    if (neverPublic.includes(item.id) && item.safeToClaimPublicly) {
      violations.push(`${item.id}: must never be safeToClaimPublicly`)
    }
    if (item.id === 'encryption_at_rest' && item.safeToClaimPublicly) {
      violations.push('encryption_at_rest: partial — cannot claim publicly without verified evidence')
    }
  }
  return violations
}
