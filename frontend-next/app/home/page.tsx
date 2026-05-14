import { ChildSelectorHome } from '@/components/child-journey/child-selector-home'
import { getChildSelectorCards } from '@/lib/child-journey/data'

export default async function HomePage() {
  const { cards, source, error } = await getChildSelectorCards()
  return <ChildSelectorHome cards={cards} source={source} error={error} />
}
