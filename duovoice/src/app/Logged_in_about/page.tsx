'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
      {/* DuoVoice logo/home link */}
      <div className="mb-6">
        <Link href="/homepage" className="flex items-center group">
          <div className="">
            <Image
              src="/DuoVoice_Logo_Transparent.png"
              alt="DuoVoice Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-2xl font-bold text-gray-800 relative">
            Duo
            <span className="text-[#0072CE]">Voice</span>
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#408830] 
                             transform scale-x-0 group-hover:scale-x-100 
                             transition-transform duration-300 ease-out" />
          </span>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-4">Sign-Language Practice</h1>
      {showPractice && <Practice />}
    </main>
  )
}
