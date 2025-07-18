import Link from 'next/link';
import Header from '@/app/components/Header'
export default function AboutPage() {
  return (
      <div className="min-h-screen bg-[#FDF6E9]">
                <Header/>
         <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">About Duovoice</h1>
      <p>Duovoice connects mute and hearing users via sign language + video.</p>

    </main></div>
   
  )
}