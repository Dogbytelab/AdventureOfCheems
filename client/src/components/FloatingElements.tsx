import { motion } from "framer-motion";
import cheemsImage from "@assets/cheems_1750165292013.png";
import heartImage from "@assets/heart_1750165292012.png";

export default function FloatingElements() {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none">
      {/* Floating Cheems Astronaut */}
      <motion.div
        className="absolute top-20 left-10"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <img
          src={cheemsImage}
          alt="Cheems Astronaut"
          className="w-16 h-16 opacity-80"
          style={{ imageRendering: "pixelated" }}
        />
      </motion.div>

      {/* Floating Heart */}
      <motion.div
        className="absolute top-32 right-20"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      >
        <img
          src={heartImage}
          alt="Heart"
          className="w-12 h-12 opacity-70"
          style={{ imageRendering: "pixelated" }}
        />
      </motion.div>

      {/* Additional floating hearts */}
      <motion.div
        className="absolute bottom-40 left-1/4"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <img
          src={heartImage}
          alt="Heart"
          className="w-8 h-8 opacity-50"
          style={{ imageRendering: "pixelated" }}
        />
      </motion.div>

      <motion.div
        className="absolute top-1/2 right-10"
        animate={{
          y: [0, -15, 0],
          x: [0, 5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      >
        <img
          src={cheemsImage}
          alt="Cheems"
          className="w-12 h-12 opacity-60"
          style={{ imageRendering: "pixelated" }}
        />
      </motion.div>
    </div>
  );
}
