type MobileConversationDrawerProps = {
  conversations: Array<{
    id: string
    title: string
    updatedAt: string
  }>
  activeConversationId?: string
  open: boolean
  onClose: () => void
  onSelect?: (id: string) => void
  onCreateConversation?: () => void
}

export function MobileConversationDrawer({
  conversations,
  activeConversationId,
  open,
  onClose,
  onSelect,
  onCreateConversation
}: MobileConversationDrawerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <button
        aria-label="Close conversations"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="absolute bottom-0 left-0 top-0 flex w-[86vw] max-w-[360px] flex-col border-r border-white/10 bg-[#0a0f1d] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div>
            <div className="text-sm font-black text-white">Conversations</div>
            <div className="mt-1 text-xs text-slate-500">IndiCare assistant history</div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-white"
          >
            Close
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-5">
          <button
            onClick={() => {
              onCreateConversation?.()
              onClose()
            }}
            className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-left text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.35)]"
          >
            + New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  onSelect?.(conversation.id)
                  onClose()
                }}
                className={`w-full rounded-2xl px-4 py-4 text-left transition ${activeConversationId === conversation.id ? 'bg-white/10 text-white' : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="truncate text-sm font-bold">
                  {conversation.title}
                </div>

                <div className="mt-2 text-[11px] uppercase tracking-[0.18em] opacity-60">
                  {conversation.updatedAt}
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
