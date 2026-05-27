'use client'

import { useState } from 'react'

const actions = [
  'Invite staff',
  'Change role',
  'Deactivate access',
  'Require MFA'
]

export function StaffAccessControls() {
  const [notice, setNotice] = useState('Role changes are not written until the admin access endpoint is enabled.')

  return (
    <div className="rounded-[28px] border border-amber-100 bg-amber-50 p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">Controlled limitation</p>
      <h2 className="mt-2 text-xl font-black text-amber-950">Staff access controls are foundation-ready</h2>
      <p className="mt-2 text-sm leading-6 text-amber-900">{notice}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setNotice(`${action} needs the live admin/staff endpoint. No access has been changed.`)}
            className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-black text-amber-900 shadow-sm"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}
