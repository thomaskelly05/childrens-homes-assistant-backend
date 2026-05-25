import { redirect } from 'next/navigation'

import { childWorkspaceHref } from '@/lib/navigation/child-workspace-routes'

/** Legacy path — canonical child workspace is under /os/young-people/{id}/workspace. */
export default async function YoungPersonWorkspaceRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(childWorkspaceHref(id))
}
