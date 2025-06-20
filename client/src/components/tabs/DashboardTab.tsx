import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNFTReservations } from "@/hooks/useFirestore";
import type { User } from "@shared/schema";
import React from "react";

export default function DashboardTab() {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();

  const { data: user, refetch: refetchUser } = useQuery<User>({
    queryKey: ["/api/users", firebaseUser?.uid],
    enabled: !!firebaseUser?.uid,
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/users/${firebaseUser?.uid}`,
      );
      return response.json();
    },
  });

  // Refetch user data periodically to ensure updates are shown
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (firebaseUser?.uid) {
        refetchUser();
      }
    }, 5000); // Refetch every 5 seconds

    return () => clearInterval(interval);
  }, [firebaseUser?.uid, refetchUser]);

  const { data: nftReservations = [] } = useQuery({
    queryKey: ["/api/nft-reservations", user?.uid],
    enabled: !!user?.uid,
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/nft-reservations/${user?.uid}`,
      );
      return response.json();
    },
  });

  // Get NFT ownership counts from dedicated API endpoint
  const { data: nftCounts, refetch: refetchNFTCounts } = useQuery({
    queryKey: ["/api/nft-ownership", user?.uid],
    enabled: !!user?.uid,
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/nft-ownership/${user?.uid}`,
      );
      return response.json();
    },
  });

  // Refetch NFT counts periodically to ensure real-time updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (user?.uid) {
        refetchNFTCounts();
      }
    }, 3000); // Refetch every 3 seconds for real-time updates

    return () => clearInterval(interval);
  }, [user?.uid, refetchNFTCounts]);

  // Use NFT ownership counts from Firebase
  const nftOwnership = nftCounts || {
    NORMIE: 0,
    SIGMA: 0,
    CHAD: 0,
    total: 0,
  };

  const handleCopyReferralCode = async () => {
    if (user?.referralCode) {
      try {
        await navigator.clipboard.writeText(user.referralCode);
        toast({
          title: "Copied!",
          description: "Referral code copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy referral code",
          variant: "destructive",
        });
      }
    }
  };

  const inviteProgress = user
    ? Math.min((user.inviteCount / 100) * 100, 100)
    : 0;

  const rewardTiers = [
    {
      invites: 5,
      multiplier: "1.5x",
      points: "+100 AOC",
      completed: (user?.inviteCount || 0) >= 5,
      special: false,
    },
    {
      invites: 10,
      multiplier: "2x",
      points: "+100 AOC",
      completed: (user?.inviteCount || 0) >= 10,
      special: false,
    },
    {
      invites: 25,
      multiplier: "3x",
      points: "+100 AOC + 1 Free Normie",
      completed: (user?.inviteCount || 0) >= 25,
      special: true,
    },
    {
      invites: 40,
      multiplier: "4x",
      points: "+100 AOC + 1 Free Normie",
      completed: (user?.inviteCount || 0) >= 40,
      special: true,
    },
    {
      invites: 50,
      multiplier: "5x",
      points: "+100 AOC + 1 Free Normie",
      completed: (user?.inviteCount || 0) >= 50,
      special: true,
    },
    {
      invites: 80,
      multiplier: "8x",
      points: "+100 AOC + 1 Free Normie",
      completed: (user?.inviteCount || 0) >= 80,
      special: true,
    },
    {
      invites: 99,
      multiplier: "10x",
      points: "+100 AOC + 1 Free Normie",
      completed: (user?.inviteCount || 0) >= 99,
      special: true,
    },
    {
      invites: 100,
      multiplier: "10x",
      points: "+100 AOC",
      completed: (user?.inviteCount || 0) >= 100,
      special: false,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.h2
        className="text-3xl font-retro text-accent mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        DASHBOARD
      </motion.h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AOC Points Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="glass-effect border-accent/30">
            <CardContent className="pt-6">
              <h3 className="text-xl font-retro text-accent mb-4">
                AOC POINTS
              </h3>
              <div className="text-4xl font-bold text-success mb-2">
                {(user?.aocPoints || 0).toLocaleString()}
              </div>
              <p className="text-text-secondary">
                Do tasks. Invite friends. more gains
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral Card */}
        <motion.div
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="glass-effect border-accent/30">
            <CardContent className="pt-6">
              <h3 className="text-xl font-retro text-accent mb-4">
                REFERRAL CODE
              </h3>
              <div className="flex items-center space-x-2 mb-4">
                <Input
                  type="text"
                  readOnly
                  value={user?.referralCode || "Loading..."}
                  className="flex-1 bg-secondary/50 border-gray-600 text-black font-mono"
                  disabled={!user?.referralCode}
                />
                <Button
                  onClick={handleCopyReferralCode}
                  size="sm"
                  className="bg-accent hover:bg-accent/80"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </Button>
              </div>
              <div className="text-text-secondary">
                Invite your homies claim the loot 🚀
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* NFT Reservations Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="glass-effect border-accent/30">
            <CardContent className="pt-6">
              <h3 className="text-xl font-retro text-accent mb-4">NFT</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">
                    Normie ($5):
                  </span>
                  <span className="text-lg font-bold text-success">
                    {nftOwnership.NORMIE || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">
                    Sigma ($25):
                  </span>
                  <span className="text-lg font-bold text-success">
                    {nftOwnership.SIGMA || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">
                    Chad ($269):
                  </span>
                  <span className="text-lg font-bold text-success">
                    {nftOwnership.CHAD || 0}
                  </span>
                </div>
                <div className="border-t border-gray-600 pt-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-accent">
                      My Meme Wealth💰:
                    </span>
                    <span className="text-xl font-bold text-accent">
                      {nftOwnership.total ||
                        (nftOwnership.NORMIE || 0) +
                          (nftOwnership.SIGMA || 0) +
                          (nftOwnership.CHAD || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invites Progress */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="glass-effect border-accent/30">
            <CardContent className="pt-6">
              <h3 className="text-xl font-retro text-accent mb-4">
                INVITES PROGRESS
              </h3>
              <div className="flex items-center justify-between mb-2">
                <span>
                  Invites ={" "}
                  <span className="text-accent font-bold">
                    {user?.inviteCount || 0}
                  </span>
                </span>
                <span className="text-text-secondary">
                  Each invite = +100 AOC Points
                </span>
              </div>
              <Progress value={inviteProgress} className="mb-4" />
              <div className="space-y-3">
                <div className="text-sm text-text-secondary mb-2">
                  Reward Multipliers:
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {rewardTiers.map((tier) => (
                    <div
                      key={tier.invites}
                      className={`p-3 rounded-lg border text-center ${
                        tier.completed
                          ? tier.special
                            ? "bg-gold/20 border-gold/50"
                            : "bg-accent/20 border-accent/50"
                          : "bg-gray-600/20 border-gray-600/50"
                      }`}
                    >
                      <div
                        className={`text-sm font-bold ${
                          tier.completed
                            ? tier.special
                              ? "text-gold"
                              : "text-accent"
                            : "text-gray-400"
                        }`}
                      >
                        {tier.invites} invites
                      </div>
                      <div
                        className={`text-xs ${
                          tier.completed
                            ? tier.special
                              ? "text-gold"
                              : "text-accent"
                            : "text-gray-500"
                        }`}
                      >
                        {tier.multiplier}
                      </div>
                      <div className="text-xs text-gray-400">{tier.points}</div>
                      <div className="text-xs mt-1">
                        {tier.completed ? (tier.special ? "🎁" : "✅") : "⏳"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
