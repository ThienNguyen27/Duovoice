'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';
import Webcam from 'react-webcam';
import '@tensorflow/tfjs-backend-webgl';

// URL to your TF.js–converted ASL graph model
const MODEL_URL = '/model/asl_model/model.json';

// Labels must match training order
const LABELS = [
  'A','B','C','D','E','F','G','H','I',
  'K','L','M','N','O','P','Q','R','S',
  'T','U','V','W','X','Y',
  'del','space'
];

// A list of common English words for dynamic suggestions
const COMMON_WORDS = [
  'the','to','and','a','in','that','is','was','he','for','it','with','as','his','on','be','at','by','I','this',
  'had','not','are','but','from','or','have','an','they','which','one','you','were','her','all','she','there',
  'would','their','we','him','been','has','when','who','will','more','no','if','out','so','said','what','up',
  'its','about','into','than','them','can','only','other','new','some','could','time','these','two','may','then',
  'do','first','any','my','now','such','like','our','over','man','me','even','most','made','after','also','did',
  'many','before','must','through','back','years','where','much','your','way','well','down','should','because'
];

// Word list for spelling practice
const WORD_LIST = [
  'hello', 'world', 'practice', 'sign', 'language', 'react', 'tensorflow', 'model', 'learning', 'computer'
];

interface PhraseResponse { phrase: string }

export default function Practice() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphModel, setGraphModel] = useState<tf.GraphModel | null>(null);
  const [detector, setDetector] = useState<handpose.HandPose | null>(null);
  const [prediction, setPrediction] = useState<string>('Loading...');
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [mode, setMode] = useState<'phrase' | 'spelling'>('phrase');
  const [phrase, setPhrase] = useState<string>('');
  const [targetWord, setTargetWord] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');

  // Gamification state
  const [matchScore, setMatchScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const lastScoreRef = useRef(0);
  const correctHoldStartRef = useRef<number | null>(null);

  // Load models
  useEffect(() => {
    async function loadModels() {
      await tf.ready();
      await tf.setBackend('webgl');
      const [det, m] = await Promise.all([
        handpose.load(),
        tf.loadGraphModel(MODEL_URL)
      ]);
      setDetector(det);
      setGraphModel(m);
      setPrediction('Models loaded!');
    }
    loadModels().catch(console.error);
  }, []);

  // Fetch functions
  const fetchPhrase = async () => {
    try {
      const res = await fetch('/api/phrases/random');
      const { phrase: newPhrase } = (await res.json()) as PhraseResponse;
      setPhrase(newPhrase);
      setInputText('');
    } catch {
      console.error('Failed to load phrase');
    }
  };
  const fetchWord = () => {
    const idx = Math.floor(Math.random() * WORD_LIST.length);
    setTargetWord(WORD_LIST[idx]);
    setInputText('');
  };

  // On mount and mode change
  useEffect(() => {
    if (mode === 'phrase') fetchPhrase();
    else fetchWord();
  }, [mode]);

  // Inference + feedback loop
  useEffect(() => {
    let intervalId: number;
    if (detector && graphModel && webcamRef.current && videoLoaded && canvasRef.current) {
      const run = async () => {
        const video = webcamRef.current!.video;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        if (!video || video.readyState !== 4) return;

        const hands = await detector.estimateHands(video, true);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setPrediction('No hand detected');

        if (hands.length > 0) {
          const landmarks2d = hands[0].landmarks;
          landmarks2d.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();
          });

          const score = computeMatchScore(landmarks2d);
          setMatchScore(score);
          drawFeedback(ctx, canvas, score);
          updateScoring(score);

          // ASL classifier
          const flat = landmarks2d.flat() as number[];
          const input = tf.tensor(flat, [1, flat.length]);
          const output = graphModel.predict(input as any) as tf.Tensor;
          const scores = Array.from(output.dataSync());
          const maxIdx = scores.indexOf(Math.max(...scores));
          setPrediction(LABELS[maxIdx] || 'Unknown');
          tf.dispose([input, output]);
        }
      };
      intervalId = window.setInterval(run, 200);
    }
    return () => clearInterval(intervalId);
  }, [detector, graphModel, videoLoaded]);

  // Suggestions (phrase mode)
  const suggestions = useMemo(() => {
    const parts = inputText.split(' ');
    const prefix = parts[parts.length - 1];
    if (!prefix) return [];
    const lower = prefix.toLowerCase();
    return COMMON_WORDS.filter(
      w => w.startsWith(lower) && w.toLowerCase() !== lower
    ).slice(0, 5);
  }, [inputText]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setInputText(prev => prev + ' '); return; }
      if (e.key === 'Backspace') { e.preventDefault(); setInputText(prev => prev.slice(0, -1)); return; }
      const idx = parseInt(e.key);
      if (mode === 'phrase' && !isNaN(idx) && idx >= 1 && idx <= suggestions.length) {
        applySuggestion(suggestions[idx - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, mode]);

  // Text handlers
  const appendPredicted = () => {
    if (!prediction) return;
    if (prediction === 'del') setInputText(prev => prev.slice(0, -1));
    else if (prediction === 'space') setInputText(prev => prev + ' ');
    else setInputText(prev => prev + prediction);
  };
  const applySuggestion = (word: string) => {
    const parts = inputText.split(' ');
    parts[parts.length - 1] = word;
    const prefix = parts.slice(0, parts.length - 1).join(' ');
    setInputText(prefix ? `${prefix} ${word} ` : `${word} `);
  };

  // Submit score
  const submitWord = () => {
  const clean = inputText.trim().toLowerCase();
  if (clean === targetWord.toLowerCase()) {
    // award per-letter
    const base = targetWord.length * 10;
    setPoints(p => p + base);
    setXp(x => x + base * 2);
    setStreak(s => s + 1);
    alert('✅ Correct! +' + base + ' points');
  } else {
    setStreak(0);
    alert(`❌ Nope—you spelled “${inputText}” but the target was “${targetWord}.”`);
  }
  fetchWord();
};

  // Scoring helpers
  const computeMatchScore = (landmarks: number[][]): number => Math.floor(Math.random() * 100);
  const drawFeedback = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    score: number
  ) => {
    ctx.lineWidth = 5;
    ctx.strokeStyle = score >= 85 ? 'green' : score >= 60 ? 'orange' : 'red';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  };
  const updateScoring = (score: number) => {
    if (score >= 85) {
      if (lastScoreRef.current < 85) correctHoldStartRef.current = performance.now();
      else if (correctHoldStartRef.current && performance.now() - correctHoldStartRef.current > 1000) {
        setPoints(p => p + 50);
        setXp(x => x + 100);
        setStreak(s => s + 1);
        correctHoldStartRef.current = null;
      }
    }
    lastScoreRef.current = score;
    if (xp >= level * 1000) setLevel(l => l + 1);
  };

return (
  <div className="flex flex-col items-center p-4 space-y-4">
    {/* Mode toggle */}
    <div className="flex space-x-2">
      <button
        onClick={() => setMode('phrase')}
        className={`px-4 py-2 rounded ${mode === 'phrase' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      >
        Phrase Practice
      </button>
      <button
        onClick={() => setMode('spelling')}
        className={`px-4 py-2 rounded ${mode === 'spelling' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      >
        Spelling Practice
      </button>
    </div>

    {/* Prompt area */}
    {mode === 'phrase' ? (
      <>
        <div className="w-full max-w-lg flex items-center justify-between">
          <h2 className="text-xl font-medium">Prompt:</h2>
          <button
            onClick={fetchPhrase}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Next Phrase
          </button>
        </div>
        <p className="w-full max-w-lg p-3 border rounded bg-gray-50 whitespace-pre-wrap">
          {phrase || 'Loading...'}
        </p>
      </>
    ) : (
      <>
        <div className="w-full max-w-lg flex items-center justify-between">
          <h2 className="text-xl font-medium">Spell Word:</h2>
          <button
            onClick={fetchWord}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Next Word
          </button>
        </div>
        <p className="w-full max-w-lg p-3 border rounded bg-gray-50">{targetWord}</p>
      </>
    )}

    {/* User input display */}
    <div className="w-full max-w-lg">
      <h2 className="text-xl font-medium">Your Input:</h2>
      <p className="mt-1 p-3 border rounded bg-gray-50 whitespace-pre-wrap">{inputText}</p>
    </div>

    {/* Controls */}
    <div className="flex items-center space-x-2">
      <button onClick={appendPredicted} className="px-4 py-2 bg-blue-600 text-white rounded">
        Write Letter
      </button>
      <button onClick={() => setInputText(t => t + ' ')} className="px-4 py-2 bg-indigo-600 text-white rounded">
        Space
      </button>
      <button onClick={() => setInputText(t => t.slice(0, -1))} className="px-4 py-2 bg-red-600 text-white rounded">
        Delete
      </button>
    </div>

    {/* Dynamic suggestions (phrase only) */}
    {mode === 'phrase' && suggestions.length > 0 && (
      <div className="w-full max-w-lg">
        <div className="text-sm text-gray-500 mb-2">Suggestions (1-5):</div>
        <ul className="grid grid-cols-2 gap-2">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="p-2 border rounded cursor-pointer hover:bg-gray-100"
              onClick={() => applySuggestion(s)}
            >
              <span className="font-bold mr-1">{i + 1}.</span> {s}
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Webcam & overlay */}
    <div className="relative">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored
        videoConstraints={{ width: 320, height: 320, facingMode: 'user' }}
        width={320}
        height={320}
        className="rounded-lg shadow-md bg-gray-200"
        onUserMedia={() => setVideoLoaded(true)}
        onUserMediaError={err => setVideoError((err as Error).message)}
      />
      <canvas ref={canvasRef} className="absolute top-0 left-0 rounded-lg" width={320} height={320} />
    </div>
    <div>
      {videoError ? (
        <span className="text-red-600">Error: {videoError}</span>
      ) : videoLoaded ? (
        <span className="text-green-600">Webcam active</span>
      ) : (
        <span className="text-gray-500">Waiting for webcam...</span>
      )}
    </div>

    {mode === 'spelling' && (
      <button
        onClick={submitWord}
        className="px-4 py-2 bg-green-600 text-white rounded mt-2"
      >
        Submit Word
      </button>
    )}

    {/* Prediction & Score */}
    <div className="text-2xl font-semibold">
      Prediction: <span className="text-blue-600">{prediction}</span>
    </div>
    <div className="text-lg">Score: {matchScore}%</div>

    {/* Gamification Panel */}
    <div className="ml-6 flex flex-col space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Scoreboard</h2>
        <p>Points: <strong>{points}</strong></p>
        <p>Streak: <strong>{streak}</strong></p>
      </div>
      <div>
        <h2 className="text-2xl font-semibold">XP & Level</h2>
        <div className="w-64 bg-gray-300 rounded-full h-4 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${(xp / (level * 1000)) * 100}%` }}
          />
        </div>
        <p className="mt-1">Level {level} ({xp}/{level * 1000} XP)</p>
      </div>
    </div>
  </div>

);

}