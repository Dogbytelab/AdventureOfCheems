import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateNFTReservation } from "@/hooks/useFirestore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { verifySolanaTransaction } from "@/lib/solana";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftType: string;
  price: number;
}

export default function PaymentModal({ isOpen, onClose, nftType, price }: PaymentModalProps) {
  const [txHash, setTxHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const createReservation = useCreateNFTReservation();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/users", firebaseUser?.uid],
    enabled: !!firebaseUser?.uid,
  });

  const handleConfirmPayment = async () => {
    if (!txHash.trim()) {
      toast({
        title: "Error",
        description: "Please enter a transaction hash",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      // Verify the Solana transaction
      const verification = await verifySolanaTransaction(txHash, price);
      
      if (verification.valid) {
        // Create the NFT reservation
        await createReservation.mutateAsync({
          userId: user.id,
          nftType,
          price,
          txHash: txHash.trim(),
        });
        
        toast({
          title: "Payment Verified!",
          description: "NFT reserved successfully. You'll receive your NFT after game launch.",
        });
        
        onClose();
        setTxHash("");
      } else {
        toast({
          title: "Transaction Failed",
          description: verification.error || "Invalid transaction hash",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    if (!isVerifying) {
      onClose();
      setTxHash("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="glass-effect max-w-md w-full mx-4 border-accent/30">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-retro text-accent mb-2">Reserve NFT</h3>
                  <div className="text-lg">
                    <span className="font-bold">{nftType.toUpperCase()}</span> -{" "}
                    <span className="text-success font-bold">${price}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Payment Wallet */}
                  <div>
                    <label className="block text-sm font-bold mb-2">Payment Wallet:</label>
                    <div className="bg-secondary/50 border border-gray-600 rounded-lg p-3 font-mono text-sm break-all">
                      BmzAXDfy6rvSgj4BiZ7R8eEr83S2VpCMKVYwZ3EdgTnp
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                    <p className="text-sm text-warning">
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Send the exact amount and paste your Solana Transaction Hash below
                    </p>
                  </div>
                  
                  {/* Transaction Hash Input */}
                  <div>
                    <label className="block text-sm font-bold mb-2">Transaction Hash:</label>
                    <Input
                      type="text"
                      placeholder="Paste your transaction hash..."
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      className="bg-secondary/50 border-gray-600 text-white font-mono text-sm focus:border-accent"
                      disabled={isVerifying}
                    />
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex space-x-4 pt-4">
                    <Button
                      onClick={handleConfirmPayment}
                      disabled={isVerifying || !txHash.trim()}
                      className="flex-1 bg-success hover:bg-success/80 text-white font-bold py-3"
                    >
                      {isVerifying ? "Verifying..." : "Confirm"}
                    </Button>
                    <Button
                      onClick={handleClose}
                      disabled={isVerifying}
                      variant="outline"
                      className="flex-1 bg-gray-600 hover:bg-gray-700 border-gray-600 text-white font-bold py-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
