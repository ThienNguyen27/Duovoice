'use client'
import dynamic from 'next/dynamic'

// dynamically import Practice (no SSR)
const Practice = dynamic(() => import('../components/Practice'), {
  ssr: false,
})

export default function PracticePage() {
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Sign-Language Practice</h1>
      <Practice />
    </main>
  )
}