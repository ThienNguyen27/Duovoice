'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

// keep SSR off so model code only runs in the browser
const Practice = dynamic(() => import('../components/Practice'), {
  ssr: false,
  loading: () => <div className="py-10 text-center">Loading practice module…</div>,
})

export default function PracticePage() {
  const [showPractice, setShowPractice] = useState(false)

  useEffect(() => {
    // schedule Practice mount after initial render
    const id = setTimeout(() => setShowPractice(true), 0)
    return () => clearTimeout(id)
  }, [])

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Sign-Language Practice</h1>
      {showPractice && <Practice />}
    </main>
  )
}