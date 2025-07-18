import { NextResponse } from 'next/server'
import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  })
}
const db = admin.firestore()

export async function GET() {
  try {
    // count total docs
    const allSnap = await db.collection('phrases').get()
    const count = allSnap.size
    if (count === 0) {
      return NextResponse.json({ error: 'No phrases found' }, { status: 404 })
    }

    // pick random offset
    const offset = Math.floor(Math.random() * count)
    const snap = await db
      .collection('phrases')
      .orderBy('createdAt')
      .offset(offset)
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ error: 'No phrases found' }, { status: 404 })
    }
    const { phrase } = snap.docs[0].data()
    return NextResponse.json({ phrase: phrase as string })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
