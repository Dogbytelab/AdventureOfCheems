import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  getCurrentSOLPrice, 
  connectPhantomWallet, 
  sendSOLTransaction,
  NFT_PRICES,
  NFT_LIMITS,
  calculateSOLAmount
} from "@/lib/solana";
import { apiRequest } from "@/lib/queryClient";

interface WishlistTabProps {
  onReserveNFT: (nftType: string, price: number) => void;
}

export default function WishlistTab({ onReserveNFT }: WishlistTabProps) {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [processingStates, setProcessingStates] = useState<Record<string, boolean>>({});
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [nftSupply, setNftSupply] = useState<Record<string, { sold: number; remaining: number }>>({
    normie: { sold: 0, remaining: 25 },
    sigma: { sold: 0, remaining: 5 },
    chad: { sold: 0, remaining: 1 }
  });

  const RECIPIENT_WALLET = "BmzAXDfy6rvSgj4BiZ7R8eEr83S2VpCMKVYwZ3EdgTnp";

  // Fetch NFT supply data on component mount
  useEffect(() => {
    const fetchNFTSupply = async () => {
      try {
        const response = await fetch('/api/nft-supply');
        if (response.ok) {
          const supplyData = await response.json();
          setNftSupply(supplyData);
        }
      } catch (error) {
        console.error('Failed to fetch NFT supply:', error);
      }
    };
    
    fetchNFTSupply();
  }, []);

  const nftTypes = [
    {
      type: "normie",
      name: "🤡 NORMIE",
      price: 5,
      limit: 25,
      description: "Entry-level NFT for new holders",
      buttonColor: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
      rare: false
    },
    {
      type: "sigma",
      name: "🗿 SIGMA",
      price: 25,
      limit: 5,
      description: "Mid-tier NFT with exclusive benefits",
      buttonColor: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
      rare: true
    },
    {
      type: "chad",
      name: "💪 CHAD",
      price: 269,
      limit: 1,
      description: "Ultra-rare NFT for elite holders",
      buttonColor: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
      rare: true
    }
  ];

  const handleConnectWallet = async () => {
    try {
      const connection = await connectPhantomWallet();
      setWalletConnected(connection.connected);
      setWalletAddress(connection.publicKey);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${connection.publicKey.slice(0, 8)}...${connection.publicKey.slice(-8)}`,
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Phantom wallet",
        variant: "destructive",
      });
    }
  };

  const handlePhantomPayment = async (nftType: string, price: number) => {
    if (!firebaseUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to reserve NFTs",
        variant: "destructive",
      });
      return;
    }

    if (!walletConnected || !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your Phantom wallet first",
        variant: "destructive",
      });
      return;
    }

    setProcessingStates(prev => ({ ...prev, [nftType]: true }));

    try {
      // Get current SOL price
      const solPrice = await getCurrentSOLPrice();
      const solAmount = calculateSOLAmount(price, solPrice);

      toast({
        title: "Transaction Initiated",
        description: `Please approve the transaction for ${solAmount.toFixed(4)} SOL ($${price} USD)`,
      });

      // Send transaction via Phantom
      const txHash = await sendSOLTransaction(RECIPIENT_WALLET, solAmount);

      // Verify transaction on backend before creating reservation
      const verificationResponse = await fetch('/api/verify-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash,
          expectedAmountUSD: price,
          nftType
        })
      });

      const verification = await verificationResponse.json();

      if (!verification.valid) {
        throw new Error(verification.error || 'Transaction verification failed');
      }

      // Create NFT reservation with verified transaction
      await apiRequest("POST", `/api/nft-reservations/${firebaseUser.uid}`, {
        nftType: nftType,
        price: price,
        txHash: txHash,
        walletAddress: walletAddress,
        solAmount: solAmount.toString(),
      });

      toast({
        title: "NFT Reserved Successfully!",
        description: `Your ${nftType.toUpperCase()} NFT has been reserved. Transaction: ${txHash.slice(0, 8)}...`,
      });

      // Update local supply count
      setNftSupply(prev => ({
        ...prev,
        [nftType]: {
          sold: prev[nftType].sold + 1,
          remaining: prev[nftType].remaining - 1
        }
      }));

      // Call the parent callback
      onReserveNFT(nftType, price);

    } catch (error: any) {
      console.error('Payment failed:', error);

      let errorMessage = "Failed to process payment. Please try again.";

      if (error.message?.includes("User rejected")) {
        errorMessage = "Transaction was cancelled by user.";
      } else if (error.message?.includes("already used")) {
        errorMessage = "This transaction has already been used. Please try with a new transaction.";
      } else if (error.message?.includes("sold out")) {
        errorMessage = `${nftType.toUpperCase()} NFTs are sold out.`;
      } else if (error.message?.includes("already have")) {
        errorMessage = `You already have a reservation for ${nftType.toUpperCase()} NFT.`;
      }

      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessingStates(prev => ({ ...prev, [nftType]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl font-retro text-accent mb-4">Reserve Your NFT</h2>
        <p className="text-text-secondary mb-6">
          Secure your spot in the DogByte ecosystem with exclusive NFT reservations
        </p>

        {!walletConnected ? (
          <Button
            onClick={handleConnectWallet}
            className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent text-white font-bold py-3 px-8 retro-button mb-8"
          >
            Connect Phantom Wallet
          </Button>
        ) : (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 text-success">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Wallet Connected: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-8)}</span>
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {nftTypes.map((nft, index) => (
          <motion.div
            key={nft.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Card className={`glass-effect border-accent/30 h-full ${nft.rare ? "glow-border" : ""}`}>
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <h3 className="text-2xl font-retro text-accent mb-2">{nft.name}</h3>
                  <p className="text-text-secondary text-sm mb-3">{nft.description}</p>
                  <div className="text-3xl font-bold text-success mb-2">${nft.price}</div>
                  <div className="text-sm text-text-secondary mb-1">
                    Supply: {nft.limit} Total
                  </div>
                  <div className="text-sm font-medium">
                    <span className="text-red-400">Sold: {nftSupply[nft.type]?.sold || 0}</span>
                    <span className="mx-2">•</span>
                    <span className="text-green-400">Remaining: {nftSupply[nft.type]?.remaining || nft.limit}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-1">Benefits Include:</div>
                    <div className="text-sm">
                      {nft.type === "normie" && "• Early access to game beta\n• Basic in-game rewards"}
                      {nft.type === "sigma" && "• Premium game features\n• Enhanced rewards\n• Exclusive Discord access"}
                      {nft.type === "chad" && "• VIP game access\n• Maximum rewards\n• Direct dev communication\n• Special events"}
                    </div>
                  </div>

                  <Button
                    onClick={() => handlePhantomPayment(nft.type, nft.price)}
                    disabled={
                      processingStates[nft.type] || 
                      !walletConnected || 
                      (nftSupply[nft.type]?.remaining || nft.limit) <= 0
                    }
                    className={`w-full ${nft.buttonColor} text-white font-bold py-3 px-6 retro-button ${
                      nft.rare ? "pulse-glow" : ""
                    }`}
                  >
                    {processingStates[nft.type] ? "Processing..." : 
                     !walletConnected ? "Connect Wallet First" :
                     (nftSupply[nft.type]?.remaining || nft.limit) <= 0 ? "SOLD OUT" :
                     "Reserve with Phantom"}
                  </Button>
                </div>
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
        <div className="bg-secondary/30 border border-accent/30 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-retro text-accent mb-3">Security Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Real-time SOL price verification</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>On-chain transaction validation</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Anti-replay protection</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>NFT limit enforcement</span>
            </div>
          </div>
        </div>

        <p className="text-text-secondary mt-4 text-sm">
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          NFT reservations are processed securely through Solana blockchain verification.
          You'll receive your NFT after game launch.
        </p>
      </motion.div>
    </div>
  );
}