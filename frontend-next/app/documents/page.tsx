import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { getStaffById, getYoungPersonById, isOverdue } from '@/lib/indicare/selectors'

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Documents" title="Document library" description="Document records with categories, linked young person, uploaded by, review dates, tags and expiry/review warnings." />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Documents" value={indicareData.documents.length} />
        <StatCard label="Review warnings" value={indicareData.documents.filter((document) => isOverdue(document.reviewDate)).length} />
        <StatCard label="Categories" value={new Set(indicareData.documents.map((document) => document.category)).size} />
      </section>
      <Card>
        <SectionHeader eyebrow="Library" title="Documents" />
        <DataTable
          headers={['Title', 'Category', 'Young person', 'Uploaded by', 'Uploaded', 'Review date', 'Tags', 'Warning']}
          rows={indicareData.documents.map((document) => {
            const person = getYoungPersonById(document.youngPersonId)
            const uploader = getStaffById(document.uploadedBy)
            return [
              <a key={document.id} href={document.fileUrl} className="font-black text-slate-950 hover:text-blue-700">{document.title}</a>,
              document.category,
              person ? <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{person.preferredName}</Link> : document.youngPersonId,
              uploader?.firstName || document.uploadedBy,
              new Date(document.uploadedAt).toLocaleDateString('en-GB'),
              document.reviewDate,
              document.tags.join(', '),
              isOverdue(document.reviewDate) ? 'Review overdue' : 'In date'
            ]
          })}
          empty={<EmptyState title="No documents" description="No documents match your current filters." />}
        />
      </Card>
    </div>
  )
}
