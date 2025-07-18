import { NextResponse } from 'next/server'
import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  })
}
const db = admin.firestore()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const prefix = searchParams.get('prefix') || ''
    if (!prefix) {
      return NextResponse.json({ suggestions: [] })
    }

    const snap = await db
      .collection('phrases')
      .where('phrase', '>=', prefix)
      .where('phrase', '<', prefix + '\uf8ff')
      .orderBy('phrase')
      .limit(5)
      .get()

    const suggestions = snap.docs.map(d => d.data().phrase as string)
    return NextResponse.json({ suggestions })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
