'use client'
import { useRef, useEffect, useState } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as handpose from '@tensorflow-models/handpose'
import '@tensorflow/tfjs-backend-webgl'

export default function Practice() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [model, setModel] = useState<handpose.HandPose | null>(null)
  const signs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const [currentSign, setCurrentSign] = useState<string>(signs[0])

  // 1. Load model + start webcam
  useEffect(() => {
    async function setup() {
      // load TF.js backend
      await tf.setBackend('webgl')
      // load handpose (or your custom graph/model)
      const loaded = await handpose.load()
      setModel(loaded)

      // start webcam
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    }
    setup()
  }, [])

  // 2. Continuous detection loop
  useEffect(() => {
    let animId: number
    async function detect() {
      if (model && videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')!
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight

        // run handpose
        const preds = await model.estimateHands(videoRef.current)
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        // draw keypoints
        preds.forEach(hand => {
          hand.landmarks.forEach(([x, y]) => {
            ctx.beginPath()
            ctx.arc(x, y, 5, 0, 2 * Math.PI)
            ctx.fill()
          })
        })

        // TODO: pass landmarks into your classifier to check against `currentSign`
      }
      animId = requestAnimationFrame(detect)
    }
    detect()
    return () => cancelAnimationFrame(animId)
  }, [model, currentSign])

  // pick a new random sign
  function nextSign() {
    const idx = Math.floor(Math.random() * signs.length)
    setCurrentSign(signs[idx])
  }

  return (
    <div className="space-y-4">
      <div className="text-lg">
        👉 Please sign: <span className="font-bold">{currentSign}</span>
      </div>
      <div className="relative w-full max-w-md mx-auto">
        <video ref={videoRef} className="w-full rounded border" />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full pointer-events-none"
        />
      </div>
      <button
        onClick={nextSign}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Next Sign
      </button>
    </div>
  )
}
