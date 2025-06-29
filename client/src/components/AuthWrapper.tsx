import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGmail } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/logo_1750165292012.png";
import cheemsImage from "@assets/cheems_1750165292013.png";

interface AuthWrapperProps {
  onComingSoon: () => void;
}

export default function AuthWrapper({ onComingSoon }: AuthWrapperProps) {
  const { firebaseUser, isNewUser, setIsNewUser, setUser } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleGmailLogin = async () => {
    try {
      await signInWithGmail();
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "Unable to sign in with Gmail. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInviteCodeSubmit = async () => {
    if (!firebaseUser) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
      };
      
      // Only include inviteCode if it's not empty
      const trimmedCode = inviteCode.trim();
      if (trimmedCode) {
        payload.inviteCode = trimmedCode;
      }
      
      const response = await apiRequest("POST", "/api/users", payload);
      const userData = await response.json();
      
      // Update the user state and mark as no longer new user
      setUser(userData);
      setIsNewUser(false);
      
      if (trimmedCode) {
        toast({
          title: "Welcome!",
          description: `Account created successfully! You used referral code: ${trimmedCode}`,
        });
      } else {
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully.",
        });
      }
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipInviteCode = async () => {
    setInviteCode(""); // Clear the invite code before submitting
    await handleInviteCodeSubmit();
  };

  if (firebaseUser && isNewUser) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass-effect max-w-md w-full border-accent/30">
            <CardContent className="pt-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-retro text-accent mb-2">ENTER INVITE CODE</h2>
                <p className="text-text-secondary text-sm">Welcome to the DogByte Lab family!</p>
              </div>
              
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter your invite code..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="bg-secondary/50 border-gray-600 text-black font-pixel focus:border-accent"
                />
                
                <div className="space-y-3">
                  <Button
                    onClick={handleInviteCodeSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-accent hover:bg-accent/80 text-white font-bold py-3 retro-button"
                  >
                    {isSubmitting ? "Processing..." : "Continue to Dashboard"}
                  </Button>
                  
                  <Button
                    onClick={handleSkipInviteCode}
                    disabled={isSubmitting}
                    variant="outline"
                    className="w-full bg-gray-600 hover:bg-gray-700 border-gray-600 text-white font-bold py-3"
                  >
                    Skip
                  </Button>
                </div>
                
                <div className="text-center text-sm text-text-secondary">
                  ENTER THE CODE IN CAPITAL LETTERS — IT CAN ONLY BE USED ONCE. USE IT WISELY!
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="flex flex-col lg:flex-row items-center max-w-6xl w-full gap-8">
        {/* Left Side - Logo and Branding */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img
              src={logoImage}
              alt="DogByte Lab Logo"
              className="w-32 h-32 mx-auto lg:mx-0"
              style={{ imageRendering: "pixelated" }}
            />
          </motion.div>
          
          <motion.h1
            className="text-4xl lg:text-6xl font-retro text-accent mb-4 tracking-wider"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            DOGBYTE LAB
          </motion.h1>
          
          <motion.p
            className="text-lg text-text-secondary mb-8 max-w-md mx-auto lg:mx-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Join the ultimate meme gaming revolution. AOC awaits your participation in the cosmic adventure!
          </motion.p>
          
          {/* Floating decorative elements */}
          <div className="relative">
            <motion.div
              className="absolute -top-4 -left-4"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <img
                src={cheemsImage}
                alt="Cheems"
                className="w-12 h-12 opacity-60"
                style={{ imageRendering: "pixelated" }}
              />
            </motion.div>
          </div>
        </div>
        
        {/* Right Side - Login Form */}
        <motion.div
          className="flex-1 max-w-md w-full"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="glass-effect border-accent/30">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-retro text-center mb-8 text-accent">ENTER THE LAB</h2>
              
              <div className="space-y-4">
                <Button
                  onClick={handleGmailLogin}
                  className="w-full bg-accent hover:bg-accent/80 text-white font-bold py-4 retro-button pulse-glow"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Gmail
                </Button>
                
                <Button
                  onClick={onComingSoon}
                  className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-4 retro-button opacity-75"
                >
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Sign in with Sol Wallet
                </Button>
                
                <div className="text-center text-sm text-text-secondary">
                  By signing in, you agree to join the meme revolution
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
