import { RelationshipConstellation } from '@/components/RelationshipConstellation'

export default function RelationshipsPage() {
  return (
    <main className="min-h-screen bg-[#060912] px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <RelationshipConstellation
          nodes={[
            {
              id: 'relationship_1',
              label: 'Trusted key worker',
              emotion: 'safe',
            },
            {
              id: 'relationship_2',
              label: 'Positive peer friendship',
              emotion: 'connected',
            },
            {
              id: 'relationship_3',
              label: 'Football mentor',
              emotion: 'encouraged',
            },
          ]}
          links={[
            {
              source: 'relationship_1',
              target: 'relationship_2',
            },
            {
              source: 'relationship_2',
              target: 'relationship_3',
            },
          ]}
        />
      </div>
    </main>
  )
}
