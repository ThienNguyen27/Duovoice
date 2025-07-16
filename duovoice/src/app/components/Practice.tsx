'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as handpose from '@tensorflow-models/handpose'
import Webcam from 'react-webcam'
import '@tensorflow/tfjs-backend-webgl'

// URL to your TF.js–converted ASL graph model
const MODEL_URL = '/model/asl_model/model.json'

// Labels must match training order
const LABELS = [
  'A','B','C','D','E','F','G','H','I',
  'K','L','M','N','O','P','Q','R','S',
  'T','U','V','W','X','Y',
  'del','space'
]

export default function Practice() {
  const webcamRef = useRef<Webcam>(null)
  const [model, setModel] = useState<tf.GraphModel | null>(null)
  const [detector, setDetector] = useState<handpose.HandPose | null>(null)
  const [prediction, setPrediction] = useState<string>('Loading...')
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Load handpose detector and TF.js graph model
  useEffect(() => {
    async function loadModels() {
      await tf.ready()
      await tf.setBackend('webgl')

      const [det, m] = await Promise.all([
        handpose.load(),
        tf.loadGraphModel(MODEL_URL)
      ])

      setDetector(det)
      setModel(m)
      setPrediction('Models loaded!')
    }
    loadModels().catch(console.error)
  }, [])

  // Inference loop (~5 FPS)
  useEffect(() => {
    let intervalId: number
    if (model && detector && webcamRef.current && videoLoaded) {
      const run = async () => {
        const video = webcamRef.current!.video
        if (!video || video.readyState !== 4) return

        const hands = await detector.estimateHands(video, true)
        if (hands.length === 0) {
          setPrediction('No hand detected')
          return
        }

        const landmarks = (hands[0].landmarks as number[][]).flat() as number[]
        const input = tf.tensor(landmarks, [1, landmarks.length])
        const output = model.predict({ inputs: input }) as tf.Tensor
        const scores = Array.from(output.dataSync())
        const maxIndex = scores.indexOf(Math.max(...scores))
        setPrediction(LABELS[maxIndex] || 'Unknown')

        tf.dispose([input, output])
      }
      intervalId = window.setInterval(run, 200)
    }
    return () => clearInterval(intervalId)
  }, [model, detector, videoLoaded])

  return (
    <div className="flex flex-col items-center p-4">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored
        videoConstraints={{ width: 320, height: 320, facingMode: 'user' }}
        width={320}
        height={320}
        className="rounded-lg shadow-md bg-gray-200"
        onUserMedia={() => {
          console.log('Webcam started')
          setVideoLoaded(true)
        }}
        onUserMediaError={(err) => {
          console.error('Webcam error', err)
          setVideoError((err as Error).message)
        }}
      />

      <div className="mt-2">
        {videoError ? (
          <span className="text-red-600">Error: {videoError}</span>
        ) : videoLoaded ? (
          <span className="text-green-600">Webcam active</span>
        ) : (
          <span className="text-gray-500">Waiting for webcam...</span>
        )}
      </div>

      <div className="mt-4 text-2xl font-semibold">
        Prediction: <span className="text-blue-600">{prediction}</span>
      </div>
    </div>
  )
}
