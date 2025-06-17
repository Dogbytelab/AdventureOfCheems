import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ComingSoonModal({ isOpen, onClose }: ComingSoonModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="glass-effect max-w-sm w-full mx-4 border-accent/30 text-center">
              <CardContent className="pt-6">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-2xl font-retro text-accent mb-4">Coming Soon...</h3>
                <p className="text-text-secondary mb-6">
                  Solana wallet integration is coming soon!
                </p>
                <Button
                  onClick={onClose}
                  className="bg-accent hover:bg-accent/80 text-white font-bold py-3 px-6"
                >
                  Got it!
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
