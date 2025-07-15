import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">About Duovoice</h1>
      <p>Duovoice connects mute and hearing users via sign language + video.</p>
      <Link href="/">
        
           Back to Home
      
      </Link>
    </main>
  )
}