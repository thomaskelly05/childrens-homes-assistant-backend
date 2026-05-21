type ConstellationNode = {
  id: string
  label: string
  emotion: string
}

type ConstellationLink = {
  source: string
  target: string
}

type Props = {
  nodes: ConstellationNode[]
  links: ConstellationLink[]
}

export function RelationshipConstellation({ nodes, links }: Props) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,199,255,0.18),transparent_60%)]" />

      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
              Relationship constellation
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Visualising emotionally important connections and memories.
            </p>
          </div>

          <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
            {nodes.length} memory nodes
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="rounded-3xl border border-white/10 bg-black/20 p-5"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.9)]" />
                <div className="text-white/90">{node.label}</div>
              </div>

              <div className="flex items-center justify-between text-sm text-white/60">
                <span>{node.emotion}</span>
                <span>
                  {
                    links.filter(
                      (link) =>
                        link.source === node.id || link.target === node.id,
                    ).length
                  } connections
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
