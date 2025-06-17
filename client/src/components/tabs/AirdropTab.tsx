import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export default function AirdropTab() {
  const criteria = [
    "Complete all tasks",
    "Accumulate AOC Points",
    "Refer active users",
    "Wishlist NFTs (bonus eligibility)",
  ];

  return (
    <div className="max-w-4xl mx-auto text-center">
      <motion.div
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-8xl mb-8">🪂</div>
        <motion.h2
          className="text-6xl font-retro text-transparent bg-gradient-to-r from-accent via-accent-orange to-success bg-clip-text mb-8"
          animate={{
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          COMING SOON...
        </motion.h2>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto">
          Stay tuned for detailed information on token distribution and
          eligibility criteria. For timely updates and official announcements,
          we recommend joining our Telegram community.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card className="glass-effect border-accent/30">
          <CardContent className="pt-6">
            <h3 className="text-2xl font-retro text-accent mb-4">
              AIRDROP CRITERIA
            </h3>
            <div className="space-y-3 text-left max-w-md mx-auto">
              {criteria.map((criterion, index) => (
                <motion.div
                  key={index}
                  className="flex items-center space-x-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                >
                  <svg
                    className="w-5 h-5 text-success flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{criterion}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
