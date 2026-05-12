import { ReactNode } from 'react'

export function WorkspaceLayout({
  main,
  side
}: {
  main: ReactNode
  side: ReactNode
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">{main}</div>
      <div className="space-y-6">{side}</div>
    </div>
  )
}
