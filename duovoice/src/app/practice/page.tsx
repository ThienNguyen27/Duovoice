'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// keep SSR off so model code only runs in the browser
const Practice = dynamic(() => import('../components/Practice'), {
  ssr: false,
  loading: () => (
    <div className="py-10 text-center text-[#0072CE]">
      Loading practice module…
    </div>
  ),
})

export default function PracticePage() {
  const [showPractice, setShowPractice] = useState(false)

  useEffect(() => {
    // schedule Practice mount after initial render
    const id = setTimeout(() => setShowPractice(true), 0)
    return () => clearTimeout(id)
  }, [])

  return (
    <main className="container mx-auto p-6 space-y-6 bg-blue-50 min-h-screen">
      {/* Header card with Deaf-community blue theme */}
      <div className="flex items-center justify-between bg-[#0072CE]/30 backdrop-blur-md p-4 rounded-xl shadow-md">
        <h1 className="text-3xl font-bold text-[#0072CE]">
          Sign-Language Practice
        </h1>
        <Link
          href="/homepage"
          className="flex items-center space-x-2 group hover:opacity-90 transition"
        >
          <Image
            src="/DuoVoice_Logo_Transparent.png"
            alt="DuoVoice Logo"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
          <span className="relative text-xl font-semibold text-[#005BB5]">
            Duo<span className="text-[#0072CE]">Voice</span>
            <span
              className="
                absolute -bottom-1 left-0 w-full h-0.5 bg-[#005BB5]
                transform scale-x-0 group-hover:scale-x-100
                transition-transform duration-300 ease-out
              "
            />
          </span>
        </Link>
      </div>

      {/* Practice module container */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-[#0072CE]/50">
        {showPractice ? (
          <Practice />
        ) : (
          <div className="py-10 text-center text-[#0072CE]">
            Preparing practice…
          </div>
        )}
      </div>
    </main>
  )
}
