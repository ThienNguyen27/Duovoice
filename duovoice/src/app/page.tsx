"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { 
  useMotionValue,
  useTransform,
  useAnimation,
  motion
} from "framer-motion";

import Header from "@/app/components/header";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: i * 0.1, type: "spring", duration: 0.8, bounce: 0 },
      opacity: { delay: i * 0.1, duration: 0.01 }
    }
  })
};

const pulse = {
  scale: [1, 1.1, 1],
  transition: {
    duration: 2,
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeInOut"
  }
};

export default function Home() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [30, -30]);
  const rotateY = useTransform(x, [-100, 100], [-30, 30]);

  const controls = useAnimation();

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    controls.start("visible");
    return () => window.removeEventListener("resize", updateDimensions);
  }, [controls]);

  function handleMouse(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left - rect.width / 2);
    y.set(event.clientY - rect.top - rect.height / 2);
  }

  return (
    <div className="relative min-h-screen bg-[#E6F0FA] overflow-hidden">
      {/* Login Button */}
      <div className="absolute top-4 right-4 z-20">
        <Link href="/login">

            Log In

        </Link>
      </div>

      <Header />

      <main>
        <section
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
          onMouseMove={handleMouse}
        >
          <motion.div
            className="absolute inset-0"
            style={{ rotateX, rotateY, perspective: 1000 }}
          />

          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Speak Through Sign, Connect Through Heart
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Duovoice connects non-speaking and speaking users through live video and guided sign-language,<br/>
              making communication effortless and inclusive.
            </p>
          </motion.div>
        </section>

        <section className="py-16 bg-white/50 relative z-10">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Core Feature
            </h2>
            <motion.div
              className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <motion.div className="text-center" variants={fadeIn} whileHover={{ y: -10 }}>
                 <div className="flex justify-center items-center ">
                                <Image
                                  src="/practice_icon.jpg"
                                  alt="pratice icon"
                                  width={60}
                                  height={60}
                                />
                              </div>
                <h3 className="text-xl font-semibold mb-2">Practice Mode</h3>
                <p className="text-gray-600">
                  Featuring visual demonstrations, real-time hand tracking, and instant feedback, this mode empowers both Deaf and hearing users to sign with confidence and clarity.
                </p>
              </motion.div>
              <motion.div className="text-center" variants={fadeIn} whileHover={{ y: -10 }}>
                <div className="flex justify-center items-center ">
                                <Image
                                  src="/call_icon.png"
                                  alt="call icon"
                                  width={60}
                                  height={60}
                                />
                              </div>
                <h3 className="text-xl font-semibold mb-2">Live Call Translation</h3>
                <p className="text-gray-600">
                  Automatically detects signs and translates them into voice (and vice versa), creating a natural conversation experience.
                </p>
              </motion.div>
              <motion.div className="text-center" variants={fadeIn} whileHover={{ y: -10 }}>
                 <div className="flex justify-center items-center ">
                                <Image
                                  src="/connection_icon.png"
                                  alt="connection icon"
                                  width={60}
                                  height={60}
                                />
                              </div>
                <h3 className="text-xl font-semibold mb-2">Smart Connections</h3>
                <p className="text-gray-600">
                  After a call, users can add each other as contacts, exchange notes, or schedule future sessions.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>
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
