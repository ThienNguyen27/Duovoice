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

interface PhraseResponse { phrase: string }
interface SuggestResponse { suggestions: string[] }

export default function Practice() {
  const webcamRef = useRef<Webcam>(null)
  const [model, setModel] = useState<tf.GraphModel | null>(null)
  const [detector, setDetector] = useState<handpose.HandPose | null>(null)
  const [prediction, setPrediction] = useState<string>('Loading...')
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)

  const [phrase, setPhrase] = useState<string>('')
  const [inputText, setInputText] = useState<string>('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Load models
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

  // Fetch a random phrase
  const fetchPhrase = async () => {
    try {
      const res = await fetch('/api/phrases/random')
      const data = (await res.json()) as PhraseResponse
      setPhrase(data.phrase)
      setInputText('')
      setSuggestions([])
    } catch (err) {
      console.error('Failed to load phrase', err)
    }
  }

  // On mount
  useEffect(() => {
    fetchPhrase()
  }, [])

  // Fetch suggestions on input change
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!inputText) {
        setSuggestions([])
        return
      }
      try {
        const res = await fetch(`/api/phrases/suggest?prefix=${encodeURIComponent(inputText)}`)
        const data = (await res.json()) as SuggestResponse
        setSuggestions(data.suggestions)
      } catch (err) {
        console.error('Failed to load suggestions', err)
      }
    }
    const timer = setTimeout(loadSuggestions, 300)
    return () => clearTimeout(timer)
  }, [inputText])

  // Keyboard handlers: space, backspace, and suggestions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        setInputText(prev => prev + ' ')
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        setInputText(prev => prev.slice(0, -1))
        return
      }
      const idx = parseInt(e.key)
      if (!isNaN(idx) && idx >= 1 && idx <= 5) {
        const sel = suggestions[idx - 1]
        if (sel) setInputText(sel)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [suggestions])

  // Append the model's predicted letter
  const appendPredicted = () => {
    if (!prediction) return
    if (prediction === 'del') {
      setInputText(prev => prev.slice(0, -1))
    } else if (prediction === 'space') {
      setInputText(prev => prev + ' ')
    } else {
      setInputText(prev => prev + prediction)
    }
  }

  return (
    <div className='flex flex-col items-center p-4 space-y-4'>
      {/* Prompt and refresh */}
      <div className='w-full max-w-lg flex items-center justify-between'>
        <h2 className='text-xl font-medium'>Prompt:</h2>
        <button
          onClick={fetchPhrase}
          className='px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700'
        >
          Next Phrase
        </button>
      </div>
      <p className='w-full max-w-lg mt-1 p-3 border rounded bg-gray-50 whitespace-pre-wrap'>
        {phrase || 'Loading...'}
      </p>

      {/* User input display */}
      <div className='w-full max-w-lg'>
        <h2 className='text-xl font-medium'>Your Input:</h2>
        <p className='mt-1 p-3 border rounded bg-gray-50 whitespace-pre-wrap'>
          {inputText}
        </p>
      </div>

      {/* Controls */}
      <div className='flex items-center space-x-2'>
        <button
          onClick={appendPredicted}
          className='px-4 py-2 bg-blue-600 text-white rounded'
        >
          Write Letter
        </button>
        <span className='text-sm text-gray-600'>or press <strong>Space</strong></span>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className='w-full max-w-lg'>
          <div className='text-sm text-gray-500 mb-2'>Suggestions (press 1-5):</div>
          <ul className='grid grid-cols-2 gap-2'>
            {suggestions.map((s, i) => (
              <li
                key={i}
                className='p-2 border rounded hover:bg-gray-100 cursor-pointer'
                onClick={() => setInputText(s)}
              >
                <span className='font-bold mr-1'>{i + 1}.</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Webcam & Prediction */}
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored
        videoConstraints={{ width: 320, height: 320, facingMode: 'user' }}
        width={320}
        height={320}
        className='rounded-lg shadow-md bg-gray-200'
        onUserMedia={() => setVideoLoaded(true)}
        onUserMediaError={err => setVideoError((err as Error).message)}
      />
      <div>
        {videoError ? (
          <span className='text-red-600'>Error: {videoError}</span>
        ) : videoLoaded ? (
          <span className='text-green-600'>Webcam active</span>
        ) : (
          <span className='text-gray-500'>Waiting for webcam...</span>
        )}
      </div>

      <div className='text-2xl font-semibold'>
        Prediction: <span className='text-blue-600'>{prediction}</span>
      </div>
    </div>
  )
}