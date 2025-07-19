🤝 DuoVoice
Real-Time Video Translation & Sign Language Communication Platform
🚀 Why We Chose the DuoVoice Idea
    In a world driven by communication, millions of people who can’t speak or hear still face major challenges in expressing themselves — especially in real-time conversations. While voice and video calls are easy for most, they exclude the Deaf and nonverbal communities.

    That’s why we created DuoVoice — a live video communication platform that uses AI-powered sign language recognition and translation, helping users bridge the communication gap in real time.

    Whether it's a Deaf individual signing to a hearing person, or vice versa, DuoVoice provides smooth, live, and private interaction — without needing interpreters or external apps.

🛠️ How We Built It
    🔹 Frontend
        React & TypeScript – For fast, dynamic, and strongly typed UI.

        Tailwind CSS – For clean, responsive styling.

        Next.js – As both a frontend framework and SSR tool.

    🔹 Backend
        FastAPI – For fast, scalable backend API handling.

        WebRTC (simple-peer, peer.js) – To enable real-time peer-to-peer video communication.

        TURN Server & Socket.io – For reliable video signaling and NAT traversal.

    🔹 Database
        Firebase – For real-time storage, user auth, and syncing communication sessions.

    🔹 AI Model
        PyTorch + OpenCV + YOLOv8 – Used to detect, track, and classify sign language gestures in live video.

🧩 Challenges We Faced
    🧠 Training sign language models with real-world video data

    📡 Integrating WebRTC with our backend and AI pipeline

    🔒 Ensuring privacy and low-latency during peer-to-peer communication

    🎨 Building an intuitive and inclusive interface for all users

    🔌 Managing real-time events with Socket.io and signaling servers

📚 Lessons Learned
    🧠 Deepened knowledge in real-time communication protocols

    📷 Gained experience in computer vision and gesture detection

    🔧 Developed strong backend/frontend integration skills

    🌍 Built awareness around inclusive design and accessibility