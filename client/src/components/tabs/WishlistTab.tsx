import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WishlistTabProps {
  onReserveNFT: (nftType: string, price: number) => void;
}

export default function WishlistTab({ onReserveNFT }: WishlistTabProps) {
  const nfts = [
    {
      type: "normie",
      emoji: "💠",
      name: "NORMIE",
      price: 5,
      supply: 10000,
      color: "text-blue-400",
      buttonColor: "bg-blue-500 hover:bg-blue-600",
    },
    {
      type: "sigma",
      emoji: "💎",
      name: "SIGMA",
      price: 25,
      supply: 1000,
      color: "text-purple-400",
      buttonColor: "bg-purple-500 hover:bg-purple-600",
      popular: true,
    },
    {
      type: "chad",
      emoji: "🔥",
      name: "CHAD",
      price: 269,
      supply: 100,
      color: "text-accent",
      buttonColor: "bg-accent hover:bg-accent/80",
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
                  onClick={() => onReserveNFT(nft.type, nft.price)}
                  className={`w-full ${nft.buttonColor} text-white font-bold py-3 px-6 retro-button ${
                    nft.rare ? "pulse-glow" : ""
                  }`}
                >
                  Reserve Now
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
