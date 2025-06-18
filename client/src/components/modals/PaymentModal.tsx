import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateNFTReservation } from "@/hooks/useFirestore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCurrentSOLPrice, calculateSOLAmount } from "@/lib/solana";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftType: string;
  price: number;
}

export default function PaymentModal({
  isOpen,
  onClose,
  nftType,
  price,
}: PaymentModalProps) {
  const [txHash, setTxHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solAmount, setSolAmount] = useState<number | null>(null);
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const createReservation = useCreateNFTReservation();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/users", firebaseUser?.uid],
    enabled: !!firebaseUser?.uid,
  });

  // Fetch SOL price when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchSOLPrice = async () => {
        try {
          const currentPrice = await getCurrentSOLPrice();
          setSolPrice(currentPrice);
          setSolAmount(calculateSOLAmount(price, currentPrice));
        } catch (error) {
          console.error("Failed to fetch SOL price:", error);
          toast({
            title: "Price Fetch Error",
            description: "Unable to fetch current SOL price. Please try again.",
            variant: "destructive",
          });
        }
      };

      // Wrap in try-catch to prevent unhandled rejections
      fetchSOLPrice().catch((error) => {
        console.error("Unhandled error in fetchSOLPrice:", error);
      });
    }
  }, [isOpen, price, toast]);

  const handleConfirmPayment = async () => {
    const trimmedTxHash = txHash.trim();

    if (!trimmedTxHash) {
      toast({
        title: "Transaction Hash Required",
        description: "Please enter the transaction hash from your wallet",
        variant: "destructive",
      });
      return;
    }

    // Validate Base58 format
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;
    if (!base58Regex.test(trimmedTxHash)) {
      toast({
        title: "Invalid Transaction Hash",
        description:
          "Please enter a valid Solana transaction hash (32-88 Base58 characters)",
        variant: "destructive",
      });
      return;
    }

    if (!user && !firebaseUser?.uid) {
      toast({
        title: "Authentication Error",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }

    // Use firebaseUser.uid as fallback if user query fails
    const userUid = user?.uid || firebaseUser?.uid;

    setIsVerifying(true);

    try {
      // Verify the transaction via backend API
      const verificationResponse = await fetch("/api/verify-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash: trimmedTxHash,
          expectedAmountUSD: price,
          nftType,
        }),
      });

      if (!verificationResponse.ok) {
        throw new Error(`Server error: ${verificationResponse.status}`);
      }

      const verification = await verificationResponse.json();

      console.log("Transaction verification result:", verification);

      if (verification.valid) {
        // Create the NFT reservation via API (simplified with new txHash system)
        const reservationResponse = await fetch(
          `/api/nft-reservations/${userUid}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nftType: nftType.toUpperCase(),
              txHash: trimmedTxHash,
            }),
          },
        );

        if (!reservationResponse.ok) {
          const errorData = await reservationResponse.json().catch(() => ({ message: "Unknown error" }));
          console.error("Reservation creation failed:", errorData);
          throw new Error(errorData.message || "Failed to create NFT reservation");
        }

        const reservationData = await reservationResponse.json();
        console.log("NFT reservation created successfully:", reservationData);

        toast({
          title: "Payment Verified!",
          description: `Your ${nftType.toUpperCase()} NFT has been reserved successfully.`,
        });

        onClose();
        setTxHash("");
      } else {
        console.error("Transaction verification failed:", verification);
        toast({
          title: "Payment Verification Failed",
          description:
            verification.error || "Transaction could not be verified",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      toast({
        title: "Payment Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to verify transaction. Please try again.",
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
                  <h3 className="text-2xl font-retro text-accent mb-2">
                    Reserve NFT
                  </h3>
                  <div className="text-lg">
                    <span className="font-bold">{nftType.toUpperCase()}</span> -{" "}
                    <span className="text-success font-bold">${price}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Payment Amount */}
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Payment Amount:
                    </label>
                    <div className="bg-secondary/50 border border-accent/30 rounded-lg p-3">
                      <div className="text-lg font-bold text-accent">
                        ${price} USD
                        {solAmount && (
                          <span className="text-sm text-text-secondary ml-2">
                            ≈ {solAmount.toFixed(4)} SOL
                          </span>
                        )}
                      </div>
                      {solPrice && (
                        <div className="text-xs text-text-secondary mt-1">
                          SOL Price: ${solPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Wallet */}
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Send Payment To:
                    </label>
                    <div className="bg-secondary/50 border border-gray-600 rounded-lg p-3 font-mono text-sm break-all">
                      BmzAXDfy6rvSgj4BiZ7R8eEr83S2VpCMKVYwZ3EdgTnp
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                    <p className="text-sm text-warning">
                      <svg
                        className="w-4 h-4 inline mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      Send{" "}
                      {solAmount
                        ? `${solAmount.toFixed(4)} SOL`
                        : `$${price} USD worth of SOL`}{" "}
                      to the wallet above, then paste your transaction hash
                      below
                    </p>
                  </div>

                  {/* Transaction Hash Input */}
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Transaction Hash:
                    </label>
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
