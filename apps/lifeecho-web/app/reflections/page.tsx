import { ReflectionJournal } from '@/components/ReflectionJournal'

export default function ReflectionsPage() {
  return (
    <main className="min-h-screen bg-[#060912] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <ReflectionJournal
          reflections={[
            {
              id: 'reflection_1',
              title: 'Feeling more confident',
              content:
                'Today felt calmer. I felt more comfortable speaking to people and joining activities.',
              created_at: new Date().toISOString(),
            },
            {
              id: 'reflection_2',
              title: 'Proud moment',
              content:
                'I completed my school work and felt proud of myself afterwards.',
              created_at: new Date().toISOString(),
            },
          ]}
        />
      </div>
    </main>
  )
}
