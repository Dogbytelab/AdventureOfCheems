import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function DashboardTab() {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/users", firebaseUser?.uid],
    enabled: !!firebaseUser?.uid,
  });

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

  const inviteProgress = user ? Math.min((user.inviteCount / 25) * 100, 100) : 0;
  
  const rewardTiers = [
    { invites: 1, completed: (user?.inviteCount || 0) >= 1 },
    { invites: 5, completed: (user?.inviteCount || 0) >= 5 },
    { invites: 10, completed: (user?.inviteCount || 0) >= 10 },
    { invites: 25, completed: (user?.inviteCount || 0) >= 25 },
    { invites: 50, completed: (user?.inviteCount || 0) >= 50 },
    { invites: 100, completed: (user?.inviteCount || 0) >= 100 },
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                {user?.aocPoints?.toLocaleString() || "0"}
              </div>
              <p className="text-text-secondary">Earn more by completing tasks!</p>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Referral Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
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
                  value={user?.referralCode || "Loading..."}
                  className="flex-1 bg-secondary/50 border-gray-600 text-white font-mono"
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
        
        {/* Invites Progress */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="glass-effect border-accent/30">
            <CardContent className="pt-6">
              <h3 className="text-xl font-retro text-accent mb-4">INVITES PROGRESS</h3>
              <div className="flex items-center justify-between mb-2">
                <span>
                  Invites = <span className="text-accent font-bold">{user?.inviteCount || 0}</span>
                </span>
                <span className="text-text-secondary">Next bonus at 25</span>
              </div>
              <Progress value={inviteProgress} className="mb-4" />
              <div className="grid grid-cols-6 gap-2">
                {rewardTiers.map((tier, index) => (
                  <div
                    key={tier.invites}
                    className={`text-center p-2 rounded-lg border ${
                      tier.completed
                        ? tier.invites <= 5
                          ? "bg-success/20 border-success/50"
                          : tier.invites === 10
                          ? "bg-warning/20 border-warning/50"
                          : "bg-accent/20 border-accent/50"
                        : "bg-gray-600/20 border-gray-600/50"
                    }`}
                  >
                    <div
                      className={`text-xs font-bold ${
                        tier.completed
                          ? tier.invites <= 5
                            ? "text-success"
                            : tier.invites === 10
                            ? "text-warning"
                            : "text-accent"
                          : "text-gray-400"
                      }`}
                    >
                      {tier.invites}
                    </div>
                    <div className="text-xs">
                      {tier.completed ? "✓" : "-"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
