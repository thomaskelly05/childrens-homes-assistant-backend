type ConversationSidebarProps = {
  conversations: Array<{
    id: string
    title: string
    updatedAt: string
  }>
  activeConversationId?: string
  onSelect?: (id: string) => void
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelect
}: ConversationSidebarProps) {
  return (
    <aside className="hidden w-[320px] border-r border-white/10 bg-[#0a0f1d] xl:flex xl:flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <button className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-left text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.35)]">
          + New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelect?.(conversation.id)}
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
  )
}
