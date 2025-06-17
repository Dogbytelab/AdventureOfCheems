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

export default function DashboardTab() {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/users", firebaseUser?.uid],
    enabled: !!firebaseUser?.uid,
  });

  const { data: nftReservations = [] } = useNFTReservations(user?.id || "");

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

  const inviteProgress = user ? Math.min((user.inviteCount / 100) * 100, 100) : 0;
  
  const rewardTiers = [
    { invites: 5, multiplier: "1.5x", points: "+100 AOC", completed: (user?.inviteCount || 0) >= 5 },
    { invites: 10, multiplier: "2x", points: "+100 AOC", completed: (user?.inviteCount || 0) >= 10 },
    { invites: 25, multiplier: "3x", points: "+100 AOC", completed: (user?.inviteCount || 0) >= 25 },
    { invites: 45, multiplier: "4x", points: "+100 AOC", completed: (user?.inviteCount || 0) >= 45 },
    { invites: 69, multiplier: "5x", points: "+100 AOC", completed: (user?.inviteCount || 0) >= 69 },
    { invites: 100, multiplier: "10x", points: "+100 AOC", completed: (user?.inviteCount || 0) >= 100 },
  ];

  // Calculate NFT reservations count by type
  const nftCounts = nftReservations.reduce((acc, reservation) => {
    acc[reservation.nftType] = (acc[reservation.nftType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
              <h3 className="text-xl font-retro text-accent mb-4">AOC POINTS</h3>
              <div className="text-4xl font-bold text-success mb-2">
                {(user?.aocPoints || 0).toLocaleString()}
              </div>
              <p className="text-text-secondary">Earn more by completing tasks!</p>
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
              <h3 className="text-xl font-retro text-accent mb-4">REFERRAL CODE</h3>
              <div className="flex items-center space-x-2 mb-4">
                <Input
                  type="text"
                  readOnly
                  value={user?.referralCode || "Generating..."}
                  className="flex-1 bg-secondary/50 border-gray-600 text-white font-mono"
                  disabled={!user?.referralCode}
                />
                <Button
                  onClick={handleCopyReferralCode}
                  size="sm"
                  className="bg-accent hover:bg-accent/80"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Button>
              </div>
              <div className="text-text-secondary">Share your code to earn bonuses!</div>
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
              <h3 className="text-xl font-retro text-accent mb-4">NFT RESERVATIONS</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Normie ($5):</span>
                  <span className="text-lg font-bold text-success">{nftCounts.normie || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Sigma ($25):</span>
                  <span className="text-lg font-bold text-success">{nftCounts.sigma || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Chad ($269):</span>
                  <span className="text-lg font-bold text-success">{nftCounts.chad || 0}</span>
                </div>
                <div className="border-t border-gray-600 pt-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-accent">Total NFTs:</span>
                    <span className="text-xl font-bold text-accent">{nftReservations.length}</span>
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
              <h3 className="text-xl font-retro text-accent mb-4">INVITES PROGRESS</h3>
              <div className="flex items-center justify-between mb-2">
                <span>
                  Invites = <span className="text-accent font-bold">{user?.inviteCount || 0}</span>
                </span>
                <span className="text-text-secondary">Each invite = +100 AOC Points</span>
              </div>
              <Progress value={inviteProgress} className="mb-4" />
              <div className="space-y-3">
                <div className="text-sm text-text-secondary mb-2">Reward Multipliers:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {rewardTiers.map((tier) => (
                    <div
                      key={tier.invites}
                      className={`p-3 rounded-lg border text-center ${
                        tier.completed
                          ? "bg-accent/20 border-accent/50"
                          : "bg-gray-600/20 border-gray-600/50"
                      }`}
                    >
                      <div className={`text-sm font-bold ${tier.completed ? "text-accent" : "text-gray-400"}`}>
                        {tier.invites} invites
                      </div>
                      <div className={`text-xs ${tier.completed ? "text-accent" : "text-gray-500"}`}>
                        {tier.multiplier}
                      </div>
                      <div className="text-xs text-gray-400">
                        {tier.points}
                      </div>
                      <div className="text-xs mt-1">
                        {tier.completed ? "✅" : "⏳"}
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
