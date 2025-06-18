import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface WishlistTabProps {
  onReserveNFT: (nftType: string, price: number) => void;
}

export default function WishlistTab({ onReserveNFT }: WishlistTabProps) {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [nftSupply, setNftSupply] = useState<
    Record<string, { sold: number; remaining: number }>
  >({
    normie: { sold: 0, remaining: 25000 },
    sigma: { sold: 0, remaining: 5000 },
    chad: { sold: 0, remaining: 669 },
  });

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
  }, []);

  const nftTypes = [
    {
      type: "normie",
      name: "🤡 NORMIE",
      price: 0.1,
      limit: 25,
      totalSupply: 25000,
      description: "Common NFT - Up to 25 per user",
      buttonColor:
        "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
      rare: false,
    },
    {
      type: "sigma",
      name: "🗿 SIGMA",
      price: 25,
      limit: 1,
      totalSupply: 5000,
      description: "Rare NFT - Limited to 1 per user",
      buttonColor:
        "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
      rare: true,
    },
    {
      type: "chad",
      name: "💎 CHAD",
      price: 269,
      limit: 1,
      totalSupply: 669,
      description: "Ultra Rare NFT - Limited to 1 per user",
      buttonColor:
        "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
      rare: true,
    },
  ];

  const handleReserveNFT = (nftType: string, price: number) => {
    if (!firebaseUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to reserve NFTs",
        variant: "destructive",
      });
      return;
    }

    // Trigger the payment modal via parent callback
    onReserveNFT(nftType, price);
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
        <p className="text-text-secondary mb-6">
          Send SOL manually to reserve your NFTs. Multiple reservations of the
          same type are allowed.
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {nftTypes.map((nft, index) => (
          <motion.div
            key={nft.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Card className="glass-effect border-accent/30 hover:border-accent/50 transition-all duration-300 h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-retro text-accent mb-2">
                    {nft.name}
                  </h3>
                  <div className="text-3xl font-bold text-success mb-2">
                    ${nft.price}
                  </div>
                  <p className="text-sm text-text-secondary mb-4">
                    {nft.description}
                  </p>
                </div>

                <div className="space-y-3 mb-6 flex-grow">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Total Supply:</span>
                    <span className="font-bold">
                      {nft.totalSupply.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Sold:</span>
                    <span className="font-bold text-accent">
                      {nftSupply[nft.type]?.sold || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Remaining:</span>
                    <span className="font-bold text-success">
                      {nftSupply[nft.type]?.remaining || nft.totalSupply}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Per User Limit:</span>
                    <span className="font-bold">
                      {nft.limit === 1 ? "1" : "Unlimited"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-secondary/30 rounded-full h-2 mt-4">
                    <div
                      className="bg-gradient-to-r from-accent to-success h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          ((nftSupply[nft.type]?.sold || 0) / nft.totalSupply) *
                            100,
                          100,
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <Button
                  onClick={() => handleReserveNFT(nft.type, nft.price)}
                  disabled={
                    !firebaseUser ||
                    (nftSupply[nft.type]?.remaining || nft.totalSupply) <= 0
                  }
                  className={`${nft.buttonColor} text-white font-bold py-3 retro-button w-full`}
                >
                  {(nftSupply[nft.type]?.remaining || nft.totalSupply) <= 0
                    ? "SOLD OUT"
                    : "Reserve Now"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Info Section */}
      <motion.div
        className="bg-secondary/20 border border-accent/30 rounded-lg p-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h3 className="text-xl font-retro text-accent mb-4">How It Works</h3>
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <div className="text-lg font-bold text-success mb-4">1</div>
            <p className="text-text-secondary">
              Click “Reserve Now” to begin your NFT reservation.
            </p>
          </div>
          <div>
            <div className="text-lg font-bold text-success mb-2">2</div>
            <p className="text-text-secondary">
              Send the exact SOL amount to our official wallet address
            </p>
          </div>
          <div>
            <div className="text-lg font-bold text-success mb-2">3</div>
            <p className="text-text-secondary">
              Paste your transaction hash to complete and confirm your
              reservation.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
