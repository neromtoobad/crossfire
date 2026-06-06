// Legacy market-era route — superseded by /calls/[id] in the Precall flow.
// Kept here only so old bookmarks don't 404; redirects to the feed.

import { redirect } from 'next/navigation'

export default function MarketLegacyRedirect() {
  redirect('/')
}
