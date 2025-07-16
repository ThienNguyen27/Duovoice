import Link from "next/link";

export default function Home() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [30, -30]);
  const rotateY = useTransform(x, [-100, 100], [-30, 30]);

  const controls = useAnimation();

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
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
    <main className="font-sans min-h-screen bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center p-8">
      <div className="bg-white bg-opacity-90 dark:bg-gray-800 dark:bg-opacity-90 rounded-3xl shadow-2xl p-12 max-w-3xl w-full text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">Temporary Home Page for Development</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-10">Your gateway to practicing, chatting, and calling—made simple.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/signup" className="block px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition">Sign Up</Link>
          <Link href="/practice" className="block px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition">Practice</Link>
          <Link href="/chat" className="block px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition">Chat</Link>
          <Link href="/call" className="block px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition">Call</Link>
          <Link href="/about" className="block px-6 py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition">About</Link>
        </div>
      </div>
    </main>
  );
}
