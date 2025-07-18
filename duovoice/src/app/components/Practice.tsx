'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as handpose from '@tensorflow-models/handpose';
import Webcam from 'react-webcam';
import '@tensorflow/tfjs-backend-webgl';


const LETTER_LABELS = [
  'A','B','C','D','E','F','G','H','I','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y'
];

const COMMON_WORDS = [
  'the','to','and','a','in','that','is','was','he','for','it','with','as','his','on','be','at','by','I','this',
  'had','not','are','but','from','or','have','an','they','which','one','you','were','her','all','she','there',
  'would','their','we','him','been','has','when','who','will','more','no','if','out','so','said','what','up',
  'its','about','into','than','them','can','only','other','new','some','could','time','these','two','may','then',
  'do','first','any','my','now','such','like','our','over','man','me','even','most','made','after','also','did',
  'many','before','must','through','back','years','where','much','your','way','well','down','should','because'
];

const WORD_LIST = [
  'hello', 'world', 'practice', 'sign', 'language', 'react', 'tensorflow', 'model', 'learning', 'computer'
];

interface PhraseResponse { phrase: string }

export default function Practice() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<handpose.HandPose | null>(null);
  const [prediction, setPrediction] = useState<string>('Loading...');
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Modes: phrase, spelling, single-letter
  const [mode, setMode] = useState<'phrase'|'spelling'|'letter'>('phrase');
  const [phrase, setPhrase] = useState<string>('');
  const [targetWord, setTargetWord] = useState<string>('');
  const [targetLetter, setTargetLetter] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');

  // Gamification
  const [matchScore, setMatchScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const histRef = useRef<string[]>([]);
  const sawHandRef = useRef(false);

  // Constants for smoothing
  const CONF_THRESH = 0.7;
  const HISTORY_LEN = 5;
  const MAJORITY = 3;

  // Load handpose
  useEffect(() => {
    handpose.load().then(net => setDetector(net)).catch(console.error);
  }, []);

  // Fetch utilities
  const fetchPhrase = async () => {
    try {
      const res = await fetch('/api/phrases/random');
      const { phrase } = await res.json() as PhraseResponse;
      setPhrase(phrase);
      setInputText('');
    } catch { console.error('Failed to load phrase'); }
  };
  const fetchWord = () => {
    const idx = Math.floor(Math.random() * WORD_LIST.length);
    setTargetWord(WORD_LIST[idx]);
    setInputText('');
  };
  const fetchLetter = () => {
    const idx = Math.floor(Math.random() * LETTER_LABELS.length);
    setTargetLetter(LETTER_LABELS[idx]);
  };

  // Initialize when mode changes
  useEffect(() => {
    if (mode === 'phrase') fetchPhrase();
    else if (mode === 'spelling') fetchWord();
    else if (mode === 'letter') fetchLetter();
  }, [mode]);

  // Inference loop with smoothing & backend predict
  useEffect(() => {
    let id: number;
    if (detector && webcamRef.current && canvasRef.current) {
      id = window.setInterval(async () => {
        const video = webcamRef.current!.video;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        if (!video || video.readyState !== 4) return;

        const hands = await detector.estimateHands(video, true);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (hands.length === 0) {
          if (sawHandRef.current) {
            setPrediction('No hand');
            sawHandRef.current = false;
          }
          return;
        }
        sawHandRef.current = true;

        // draw landmarks
        const lm3d = hands[0].landmarks as [number, number, number][];
        lm3d.forEach(([x,y]) => {
          ctx.beginPath(); ctx.arc(x,y,5,0,2*Math.PI); ctx.fillStyle='white'; ctx.fill();
        });

        // optional score
        const score = Math.floor(Math.random()*100);
        setMatchScore(score);
        ctx.lineWidth = 5;
        ctx.strokeStyle = score>=85?'green':score>=60?'orange':'red';
        ctx.strokeRect(0,0,canvas.width,canvas.height);

        // send landmarks to backend
        let letter = '', conf = 0;
        try {
          const res = await fetch('http://localhost:8000/predict', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ landmarks: lm3d })
          });
          const data = await res.json();
          letter = data.letter;
          conf   = data.confidence;
        } catch(e) { console.error(e); return; }

        // smooth & threshold
        if (conf > CONF_THRESH) {
          histRef.current.push(letter);
          if (histRef.current.length > HISTORY_LEN) histRef.current.shift();
          const counts = histRef.current.reduce((a,l)=>{a[l]=(a[l]||0)+1;return a;},{} as Record<string,number>);
          const [best, cnt] = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
          if (cnt >= MAJORITY) setPrediction(best);
        } else {
          histRef.current = [];
        }
      }, 200);
    }
    return () => clearInterval(id);
  }, [detector]);

  // Keyboard for phrase mode
  const suggestions = useMemo(() => {
    const parts = inputText.split(' ');
    const prefix = parts[parts.length-1].toLowerCase();
    if (!prefix) return [];
    return COMMON_WORDS.filter(w=>w.startsWith(prefix)&&w!==prefix).slice(0,5);
  }, [inputText]);
  useEffect(() => {
    const handler = (e:KeyboardEvent) => {
      if (mode==='phrase' && e.key===' ') { e.preventDefault(); setInputText(t=>t+' '); }
      else if (mode==='phrase' && e.key==='Backspace') { e.preventDefault(); setInputText(t=>t.slice(0,-1)); }
      else if (mode==='phrase') {
        const idx = parseInt(e.key);
        if (!isNaN(idx)&& idx>0&& idx<=suggestions.length) {
          const w = suggestions[idx-1];
          setInputText(prev=>prev.split(' ').slice(0,-1).concat(w).join(' ')+' ');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [suggestions, mode]);

  const appendPredicted = () => {
    if (!prediction) return;
    if (prediction==='del') setInputText(t=>t.slice(0,-1));
    else if (prediction==='space') setInputText(t=>t+' ');
    else setInputText(t=>t+prediction);
  };

  // Submit handlers
  const submitWord = () => {
    const clean = inputText.trim().toLowerCase();
    if (clean === targetWord.toLowerCase()) {
      const pts = targetWord.length*10;
      setPoints(p=>p+pts);
      setXp(x=>x+pts*2);
      setStreak(s=>s+1);
      alert(`✅ Correct! +${pts} pts`);
    } else { setStreak(0); alert(`❌ Spelled “${inputText}”, target was “${targetWord}”.`); }
    fetchWord();
  };
  const submitLetter = () => {
    if (prediction === targetLetter) {
      const pts = 20;
      setPoints(p=>p+pts);
      setXp(x=>x+pts*2);
      setStreak(s=>s+1);
      alert(`✅ Correct! +${pts} pts`);
    } else {
      setStreak(0);
      alert(`❌ You signed “${prediction}”, target was “${targetLetter}”.`);
    }
    fetchLetter();
  };

  return (
  <div className="flex flex-col items-center p-4 space-y-4">
    {/* Mode toggle */}
    <div className="flex space-x-2">
      <button
        onClick={() => setMode('phrase')}
        className={`px-4 py-2 rounded ${
          mode === 'phrase' ? 'bg-blue-600 text-white' : 'bg-gray-200'
        }`}
      >
        Phrase Practice
      </button>
      <button
        onClick={() => setMode('spelling')}
        className={`px-4 py-2 rounded ${
          mode === 'spelling' ? 'bg-blue-600 text-white' : 'bg-gray-200'
        }`}
      >
        Spelling Practice
      </button>
      <button
        onClick={() => setMode('letter')}
        className={`px-4 py-2 rounded ${
          mode === 'letter' ? 'bg-blue-600 text-white' : 'bg-gray-200'
        }`}
      >
        Letter Practice
      </button>
    </div>

    {/* Prompt area */}
    {mode === 'phrase' && (
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
    )}

    {mode === 'spelling' && (
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
        <p className="w-full max-w-lg p-3 border rounded bg-gray-50">
          {targetWord}
        </p>
      </>
    )}

    {mode === 'letter' && (
      <>
        <div className="w-full max-w-lg flex items-center justify-between">
          <h2 className="text-xl font-medium">Practice Letter:</h2>
          <button
            onClick={fetchLetter}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Next Letter
          </button>
        </div>
        <p className="w-full max-w-lg p-3 border rounded bg-gray-50 text-center text-3xl">
          {targetLetter}
        </p>
      </>
    )}

    {/* User input display */}
    <div className="w-full max-w-lg">
      <h2 className="text-xl font-medium">Your Input:</h2>
      <p className="mt-1 p-3 border rounded bg-gray-50 whitespace-pre-wrap">
        {inputText}
      </p>
    </div>

    {/* Controls */}
    <div className="flex items-center space-x-2">
      <button
        onClick={appendPredicted}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Write Letter
      </button>
      <button
        onClick={() => setInputText((t) => t + ' ')}
        className="px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Space
      </button>
      <button
        onClick={() => setInputText((t) => t.slice(0, -1))}
        className="px-4 py-2 bg-red-600 text-white rounded"
      >
        Delete
      </button>
    </div>

    {/* Suggestions (phrase only) */}
    {mode === 'phrase' && suggestions.length > 0 && (
      <div className="w-full max-w-lg">
        <div className="text-sm text-gray-500 mb-2">
          Suggestions (1-5):
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="p-2 border rounded hover:bg-gray-100 cursor-pointer"
              onClick={() =>
                setInputText((prev) =>
                  prev.split(' ').slice(0, -1).concat(s).join(' ') + ' '
                )
              }
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
        className="rounded-lg shadow-md bg-gray-200"
        onUserMedia={() => setVideoLoaded(true)}
        onUserMediaError={(err) =>
          setVideoError((err as Error).message)
        }
      />
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="absolute top-0 left-0 rounded-lg"
      />
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

    {/* Submit buttons */}
    {mode === 'spelling' && (
      <button
        onClick={submitWord}
        className="px-4 py-2 bg-green-600 text-white rounded mt-2"
      >
        Submit Word
      </button>
    )}
    {mode === 'letter' && (
      <button
        onClick={submitLetter}
        className="px-4 py-2 bg-green-600 text-white rounded mt-2"
      >
        Submit Letter
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
        <p>
          Points: <strong>{points}</strong>
        </p>
        <p>
          Streak: <strong>{streak}</strong>
        </p>
      </div>
      <div>
        <h2 className="text-2xl font-semibold">XP & Level</h2>
        <div className="w-64 bg-gray-300 rounded-full h-4 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${(xp / (level * 1000)) * 100}%` }}
          />
        </div>
        <p className="mt-1">
          Level {level} ({xp}/{level * 1000} XP)
        </p>
      </div>
    </div>
  </div>
);

}