import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface WishlistTabProps {
  onReserveNFT: (nftType: string, price: number) => void;
}

export default function WishlistTab({ onReserveNFT }: WishlistTabProps) {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const RECIPIENT_WALLET = "BmzAXDfy6rvSgj4BiZ7R8eEr83S2VpCMKVYwZ3EdgTnp";

  const handlePhantomPayment = async (nftType: string, price: number) => {
    if (!firebaseUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to reserve NFTs",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Check if Phantom wallet is available
      const { solana } = window as any;

      if (!solana?.isPhantom) {
        toast({
          title: "Phantom Wallet Required",
          description: "Please install Phantom wallet to continue",
          variant: "destructive",
        });
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Connect to Phantom wallet
      await solana.connect();

      // Get current SOL price
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const priceData = await response.json();
      const solPrice = priceData.solana.usd;
      const solAmount = price / solPrice;

      toast({
        title: "Wallet Connected",
        description: `Please approve the transaction for ${solAmount.toFixed(4)} SOL ($${price} USD)`,
      });

      // Create and send transaction
      const transaction = await solana.request({
        method: "signAndSendTransaction",
        params: {
          message: `Reserve ${nftType.toUpperCase()} NFT - $${price} USD`,
          transaction: {
            to: RECIPIENT_WALLET,
            value: Math.floor(solAmount * 1000000000), // Convert to lamports
          }
        }
      });

      // Store reservation in Firebase
      await apiRequest("POST", "/api/nft-reservations", {
        userId: firebaseUser.uid,
        nftType: nftType,
        price: price,
        txHash: transaction.signature,
      });

      toast({
        title: "NFT Reserved Successfully!",
        description: `Your ${nftType.toUpperCase()} NFT has been reserved. Transaction: ${transaction.signature.slice(0, 8)}...`,
      });

    } catch (error: any) {
      console.error('Payment failed:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const nfts = [
    {
      type: "normie",
      name: "NORMIE",
      emoji: "🤡",
      price: 5,
      supply: 25000,
      color: "text-blue-400",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      popular: false,
      rare: false,
    },
    {
      type: "sigma",
      name: "SIGMA",
      emoji: "🗿",
      price: 25,
      supply: 5000,
      color: "text-purple-400",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
      popular: true,
      rare: false,
    },
    {
      type: "chad",
      name: "CHAD",
      emoji: "💪",
      price: 269,
      supply: 669,
      color: "text-gold",
      buttonColor: "bg-gold hover:bg-gold/80",
      popular: false,
      rare: true,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <motion.h2
        className="text-3xl font-retro text-accent mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        WISHLIST NFT RESERVATION
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {nfts.map((nft, index) => (
          <motion.div
            key={nft.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className={nft.popular ? "transform scale-105" : ""}
          >
            <Card className={`glass-effect text-center ${nft.rare ? "border-accent/50" : "border-gray-700/50"}`}>
              <CardContent className="pt-6">
                <div className="text-4xl mb-4">{nft.emoji}</div>
                <h3 className={`text-2xl font-retro ${nft.color} mb-2`}>{nft.name}</h3>
                <div className="text-3xl font-bold text-success mb-2">${nft.price}</div>
                <div className="text-text-secondary mb-4">Supply: {nft.supply.toLocaleString()}</div>

                {nft.popular && (
                  <div className="bg-warning text-black text-xs font-bold py-1 px-2 rounded-full mb-4">
                    POPULAR
                  </div>
                )}

                {nft.rare && (
                  <div className="bg-accent text-white text-xs font-bold py-1 px-2 rounded-full mb-4">
                    RARE
                  </div>
                )}

                <Button
                  onClick={() => handlePhantomPayment(nft.type, nft.price)}
                  disabled={isProcessing}
                  className={`w-full ${nft.buttonColor} text-white font-bold py-3 px-6 retro-button ${
                    nft.rare ? "pulse-glow" : ""
                  }`}
                >
                  {isProcessing ? "Processing..." : "Reserve with Phantom"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <p className="text-text-secondary mb-4">
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          NFT reservations are processed manually. You'll receive your NFT after game launch.
        </p>
        <p className="text-sm text-gray-500">
          This is not a smart contract minting - reservations are handled through our platform.
        </p>
      </motion.div>
    </div>
  );
}