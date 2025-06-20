import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function HomeTab() {
  const handleDownloadGame = () => {
    // Open the game download link in a new tab - replace with actual URL when ready
    const gameDownloadUrl =
      "https://dogbytelabaoc.netlify.app/static/apk/AdventureOfCheems.apk"; // Placeholder URL
    window.open(gameDownloadUrl, "_blank");
  };

  const socialLinks = [
    {
      name: "Instagram",
      url: "https://instagram.com/aoc.offical",
      color: "bg-pink-600 hover:bg-pink-700",
      icon: "📷",
    },
    {
      name: "Twitter",
      url: "https://twitter.com/Dogbytelab",
      color: "bg-blue-500 hover:bg-blue-600",
      icon: "🐦",
    },
    {
      name: "Telegram",
      url: "https://t.me/AOCoffical",
      color: "bg-blue-400 hover:bg-blue-500",
      icon: "✈️",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl lg:text-5xl font-retro text-accent mb-6 tracking-wider">
          ADVENTURES OF CHEEMS
        </h1>
        <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
          ADVENTURE OF CHEEMS ( AOC ) IS A 2D PLATFORMER PACKED WITH MEMES,
          MYSTERIES, AND MADNESS! LEVELS, COLLECT COINS, AND EXPLORE THE
          PLAYGROUND. EQUIPPED WITH THE POWER OF MEMES AND IMAGINE THAT WILL
          HELP YOU OVERCOME OBSTACLES AND WIN BONUS YOU CLOSER TO MEME
          SUPREMACY.
        </p>
        <p className="text-lg text-warning mb-8">
          JOIN CHEEMS ON THE ULTIMATE MEME ADVENTURE! "PLAY, COLLECT, EARN, AND
          RULE THE LEADERBOARD!
        </p>
      </motion.div>

      {/* Download Button */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Button
          onClick={handleDownloadGame}
          className="bg-accent hover:bg-accent/80 text-white font-retro text-xl px-12 py-6 rounded-2xl retro-button pulse-glow"
          size="lg"
        >
          <svg
            className="w-6 h-6 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          DOWNLOAD GAME
        </Button>
        <p className="text-sm text-text-secondary mt-4">LETS GO!</p>
      </motion.div>

      {/* Social Links */}
      <motion.div
        className="flex justify-center space-x-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        {socialLinks.map((link, index) => (
          <motion.a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${link.color} text-white w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 retro-button`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
          >
            <span className="text-2xl">{link.icon}</span>
          </motion.a>
        ))}
      </motion.div>
    </div>
  );
}
