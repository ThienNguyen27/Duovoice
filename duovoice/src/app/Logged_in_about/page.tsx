"use client";

import Header from "@/app/components/header";

// import WhyItsSafe from '@/components/WhyItsSafe';

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";


const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function About() {
  return (
    <div className="relative min-h-screen bg-[#E6F0FA] overflow-hidden">
<header className="w-full z-10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/homepage" className="flex items-center group">
              <div className="relative w-20 h-25 mr-2">
                <Image
                  src="/DuoVoice_Logo_Transparent.png"
                  alt="Traider Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-2xl font-bold text-gray-800 relative">
                Duo
                <span className="text-[#0072CE]">Voice</span>
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#408830] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"></span>
              </span>
            </Link>
          </motion.div>
          </div>
      </div>

    </header>

      <main className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-bold text-gray-900 mb-4 text-center">
            About Duo
            <span className="text-[#0072CE]">Voice</span>

          </h1>
          <p className="text-xl text-gray-600 mb-12 text-center max-w-3xl mx-auto">
            Silent calls. Powerful connections.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-12 items-center mb-20"
          variants={staggerChildren}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeIn}>
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">
              Our Mission
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
             At DuoVoice, our mission is to bridge the gap between speaking and non-speaking communities by making communication accessible, inclusive, and human.
We empower users through real-time sign language translation, guided practice, and meaningful connections — ensuring that every voice, spoken or signed, can be seen, heard, and understood.

            </p>
           
          </motion.div>
       
        </motion.div>

    {/* <main >
      <WhyItsSafe />
    </main> */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
  <div className="p-4 rounded-lg shadow bg-white text-center">
    <div className="text-4xl mb-2">🧠</div>
    <h3 className="font-semibold text-lg">AI-Guided Practice</h3>
    <p className="text-sm text-gray-600">Learn sign language with real-time feedback, visual demos, and motion tracking — perfect for building confidence step-by-step.</p>
  </div>
  <div className="p-4 rounded-lg shadow bg-white text-center">
    <div className="text-4xl mb-2">✋</div>
    <h3 className="font-semibold text-lg">Live Sign Translation</h3>
    <p className="text-sm text-gray-600"> Translate sign language into text in real-time — making conversations smooth, fast, and accessible for everyone.</p>
  </div>
  <div className="p-4 rounded-lg shadow bg-white text-center">
    <div className="text-4xl mb-2">📞</div>
    <h3 className="font-semibold text-lg">Seamless Communication</h3>
    <p className="text-sm text-gray-600">Connect instantly via video calls — with built-in sign translation and silent interaction, no voice needed.</p>
  </div>
  <div className="p-4 rounded-lg shadow bg-white text-center">
    <div className="text-4xl mb-2">🌍</div>
    <h3 className="font-semibold text-lg"> Built for Everyone</h3>
    <p className="text-sm text-gray-600">DuoVoice bridges the gap between Deaf and hearing users across languages and regions, making communication universal.</p>
  </div>
</div>

<h2 className="text-xl font-bold text-center mt-10">Start Communicating Freely</h2>
<p className="text-center text-gray-600">Join DuoVoice and experience a new era of connection — inclusive, intuitive, and barrier-free.</p>
<div className="flex justify-center mt-4">



</div>
        
      </main>
      
            <footer className="border-t border-neutral-200 py-8 relative z-10">
              <div className="container mx-auto px-4">
                <motion.div
                  className="flex flex-col md:flex-row justify-between items-center"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-gray-600 text-sm">
                    © {new Date().getFullYear()} Duovoice. All rights reserved.
                  </p>
                </motion.div>
              </div>
            </footer>
    </div>
  );
}
