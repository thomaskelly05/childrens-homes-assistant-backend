export function ChildWorkspaceEmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-500" data-testid="child-workspace-empty-state">
      {message}
    </p>
  )
}
