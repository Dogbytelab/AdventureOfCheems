import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  getCurrentSOLPrice,
  connectSolanaWallet,
  connectPhantomWallet,
  sendSOLTransaction,
  NFT_PRICES,
  NFT_LIMITS,
  calculateSOLAmount,
  detectAvailableWallets,
  WalletType,
} from "@/lib/solana";
import { apiRequest } from "@/lib/queryClient";

interface WishlistTabProps {
  onReserveNFT: (nftType: string, price: number) => void;
}

export default function WishlistTab({ onReserveNFT }: WishlistTabProps) {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [processingStates, setProcessingStates] = useState<
    Record<string, boolean>
  >({});
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<any[]>([]);
  const [nftSupply, setNftSupply] = useState<
    Record<string, { sold: number; remaining: number }>
  >({
    normie: { sold: 0, remaining: 25000 },
    sigma: { sold: 0, remaining: 5000 },
    chad: { sold: 0, remaining: 669 },
  });

  const RECIPIENT_WALLET = "BmzAXDfy6rvSgj4BiZ7R8eEr83S2VpCMKVYwZ3EdgTnp";

  // Fetch NFT supply data on component mount
  useEffect(() => {
    const fetchNFTSupply = async () => {
      try {
        const response = await fetch("/api/nft-supply");
        if (response.ok) {
          const supplyData = await response.json();
          setNftSupply(supplyData);
        }
      } catch (error) {
        console.error("Failed to fetch NFT supply:", error);
      }
    };

    fetchNFTSupply();

    // Only detect wallets once on mount, not continuously
    const initialWallets = detectAvailableWallets();
    setAvailableWallets(initialWallets);
  }, []);

  const nftTypes = [
    {
      type: "normie",
      name: "🤡 NORMIE",
      price: 0.05,
      limit: 25,
      totalSupply: 25000,
      description: "",
      buttonColor:
        "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
      rare: false,
    },
    {
      type: "sigma",
      name: "🗿 SIGMA",
      price: 25,
      limit: 5,
      totalSupply: 5000,
      description: "",
      buttonColor:
        "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
      rare: true,
    },
    {
      type: "chad",
      name: "💪 CHAD",
      price: 269,
      limit: 1,
      totalSupply: 669,
      description: "",
      buttonColor:
        "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
      rare: true,
    },
  ];

  const handleConnectWallet = async () => {
    try {
      // Re-check for available wallets before connecting
      const wallets = detectAvailableWallets();
      setAvailableWallets(wallets);
      
      if (wallets.length === 0) {
        toast({
          title: "No Wallet Found",
          description: "Please install a Solana wallet (Phantom, Solflare, or Backpack) and refresh the page.",
          variant: "destructive",
        });
        return;
      }

      const connection = await connectSolanaWallet();
      setWalletConnected(connection.connected);
      setWalletAddress(connection.publicKey);
      setWalletName(connection.walletName);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${connection.walletName}: ${connection.publicKey.slice(0, 8)}...${connection.publicKey.slice(-8)}`,
      });
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      
      let errorMessage = "Failed to connect to Solana wallet";
      if (error.message?.includes("User rejected")) {
        errorMessage = "Connection was cancelled by user";
      } else if (error.message?.includes("not found")) {
        errorMessage = "Wallet not found. Please install a Solana wallet extension.";
      } else if (error.message?.includes("already connected")) {
        errorMessage = "Wallet is already connected";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
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

    setProcessingStates((prev) => ({ ...prev, [nftType]: true }));

    try {
      // Verify wallet is still connected
      if (!walletConnected || !walletAddress) {
        throw new Error("Wallet not connected. Please reconnect your wallet.");
      }

      // Get current SOL price with retry logic
      let solPrice;
      try {
        solPrice = await getCurrentSOLPrice();
        if (!solPrice || solPrice <= 0) {
          throw new Error("Invalid SOL price received");
        }
      } catch (error) {
        console.error("Failed to get SOL price:", error);
        throw new Error("Failed to get current SOL price. Please try again in a moment.");
      }

      const solAmount = calculateSOLAmount(price, solPrice);

      // Validate SOL amount
      if (solAmount <= 0 || !isFinite(solAmount)) {
        throw new Error("Invalid transaction amount calculated");
      }

      toast({
        title: "Transaction Initiated",
        description: `Please approve the transaction for ${solAmount.toFixed(4)} SOL ($${price} USD)`,
      });

      // Send transaction via wallet
      let txHash;
      try {
        txHash = await sendSOLTransaction(RECIPIENT_WALLET, solAmount);
        if (!txHash || typeof txHash !== 'string') {
          throw new Error("Invalid transaction hash received");
        }
      } catch (error: any) {
        console.error("Transaction sending failed:", error);
        if (error.message?.includes("User rejected")) {
          throw new Error("Transaction was cancelled by user");
        } else if (error.message?.includes("Insufficient funds")) {
          throw new Error("Insufficient SOL balance in your wallet");
        } else {
          throw new Error(`Transaction failed: ${error.message || "Unknown error"}`);
        }
      }

      // Verify transaction on backend before creating reservation
      const verificationResponse = await fetch("/api/verify-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash,
          expectedAmountUSD: price,
          nftType,
        }),
      });

      const verification = await verificationResponse.json();

      if (!verification.valid) {
        throw new Error(
          verification.error || "Transaction verification failed",
        );
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
      setNftSupply((prev) => ({
        ...prev,
        [nftType]: {
          sold: prev[nftType].sold + 1,
          remaining: prev[nftType].remaining - 1,
        },
      }));

      // Call the parent callback
      onReserveNFT(nftType, price);
    } catch (error: any) {
      console.error("Payment failed:", error);

      let errorMessage = "Failed to process payment. Please try again.";

      if (
        error.message?.includes("User rejected") ||
        error.message?.includes("cancelled")
      ) {
        errorMessage = "Transaction was cancelled by user.";
      } else if (
        error.message?.includes("Insufficient funds") ||
        error.message?.includes("insufficient")
      ) {
        errorMessage = "Insufficient SOL balance in your wallet.";
      } else if (error.message?.includes("Phantom wallet not found")) {
        errorMessage =
          "Phantom wallet not found. Please install Phantom wallet extension.";
      } else if (error.message?.includes("not connected")) {
        errorMessage =
          "Wallet not connected. Please reconnect your Phantom wallet.";
      } else if (error.message?.includes("already used")) {
        errorMessage =
          "This transaction has already been used. Please try with a new transaction.";
      } else if (error.message?.includes("sold out")) {
        errorMessage = `${nftType.toUpperCase()} NFTs are sold out.`;
      } else if (error.message?.includes("already have")) {
        errorMessage = `You already have a reservation for ${nftType.toUpperCase()} NFT.`;
      } else if (error.message?.includes("verification failed")) {
        errorMessage =
          "Transaction verification failed. Please contact support.";
      } else if (error.message?.includes("SOL price")) {
        errorMessage =
          "Failed to get current SOL price. Please try again in a moment.";
      } else if (error.message?.includes("Failed to verify transaction")) {
        errorMessage = "Transaction verification failed. Please try again.";
      } else if (error.message?.includes("Failed to create NFT reservation")) {
        errorMessage = "Failed to create NFT reservation. Please try again.";
      }

      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessingStates((prev) => ({ ...prev, [nftType]: false }));
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
        <h2 className="text-4xl font-retro text-accent mb-4">
          Reserve Your NFT
        </h2>
        <p className="text-text-secondary mb-6"></p>

        {!walletConnected ? (
          <div className="mb-8">
            {availableWallets.length > 0 ? (
              <div>
                <Button
                  onClick={handleConnectWallet}
                  className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent text-white font-bold py-3 px-8 retro-button mb-4"
                >
                  Connect {availableWallets[0]?.name || "Solana"} Wallet
                </Button>
                <div className="text-sm text-text-secondary">
                  Detected wallets:{" "}
                  {availableWallets.map((w) => w.name).join(", ")}
                </div>
              </div>
            ) : (
              <div>
                <Button
                  onClick={() => window.open("https://phantom.app/", "_blank")}
                  className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent text-white font-bold py-3 px-8 retro-button mb-4"
                >
                  Install Solana Wallet
                </Button>
                <div className="text-sm text-text-secondary">
                  No Solana wallet detected. Please install Phantom, Solflare,
                  or Backpack.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 text-success">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                {walletName} Connected: {walletAddress?.slice(0, 8)}...
                {walletAddress?.slice(-8)}
              </span>
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
            <Card
              className={`glass-effect border-accent/30 h-full ${nft.rare ? "glow-border" : ""}`}
            >
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <h3 className="text-2xl font-retro text-accent mb-2">
                    {nft.name}
                  </h3>
                  <p className="text-text-secondary text-sm mb-3">
                    {nft.description}
                  </p>
                  <div className="text-3xl font-bold text-success mb-2">
                    ${nft.price}
                  </div>
                  <div className="text-sm text-text-secondary mb-1">
                    Supply: {nft.totalSupply.toLocaleString()} Total
                  </div>
                  <div className="text-sm font-medium">
                    <span className="text-blue-400">
                      Max per user: {nft.limit}
                    </span>
                    <span className="mx-2">•</span>
                    <span className="text-green-400">
                      Available:{" "}
                      {(
                        nftSupply[nft.type]?.remaining || nft.totalSupply
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-1"> </div>
                    <div className="text-sm">
                      {nft.type === "normie" && ""}
                      {nft.type === "sigma" && ""}
                      {nft.type === "chad" && ""}
                    </div>
                  </div>

                  <Button
                    onClick={() => handlePhantomPayment(nft.type, nft.price)}
                    disabled={
                      processingStates[nft.type] ||
                      !walletConnected ||
                      (nftSupply[nft.type]?.remaining || nft.totalSupply) <= 0
                    }
                    className={`w-full ${nft.buttonColor} text-white font-bold py-3 px-6 retro-button ${
                      nft.rare ? "pulse-glow" : ""
                    }`}
                  >
                    {processingStates[nft.type]
                      ? "Processing..."
                      : !walletConnected
                        ? "Connect Wallet First"
                        : (nftSupply[nft.type]?.remaining || nft.totalSupply) <=
                            0
                          ? "SOLD OUT"
                          : `Reserve with ${walletName || "Wallet"}`}
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
          <h3 className="text-lg font-retro text-accent mb-3">
            Security Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-success"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Real-time SOL price verification</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-success"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>On-chain transaction validation</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-success"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Anti-replay protection</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-success"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>NFT limit enforcement</span>
            </div>
          </div>
        </div>

        <p className="text-text-secondary mt-4 text-sm">
          <svg
            className="w-5 h-5 inline mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          NFT reservations are processed securely through Solana blockchain
          verification.
        </p>
      </motion.div>
    </div>
  );
}
