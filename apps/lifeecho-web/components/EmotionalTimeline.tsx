type TimelineNode = {
  id: string
  title: string
  emotional_tone: string
  timestamp: string
}

type Props = {
  nodes: TimelineNode[]
}

export function EmotionalTimeline({ nodes }: Props) {
  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <div
          key={node.id}
          className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{node.title}</h3>
              <p className="mt-1 text-sm text-white/60">
                {new Date(node.timestamp).toLocaleDateString()}
              </p>
            </div>

            <div className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70">
              {node.emotional_tone}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
