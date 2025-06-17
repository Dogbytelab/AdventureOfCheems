import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AuthWrapper from "@/components/AuthWrapper";
import MainApp from "@/components/MainApp";
import FloatingElements from "@/components/FloatingElements";
import ComingSoonModal from "@/components/modals/ComingSoonModal";
import backgroundImage from "@assets/background_1750165292013.png";

export default function Home() {
  const { firebaseUser, user, loading, isNewUser } = useAuth();
  const [showComingSoon, setShowComingSoon] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-accent font-retro text-xl">Loading...</div>
      </div>
    );
  }

  const isAuthenticated = firebaseUser && user && !isNewUser;

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundColor: "#0a0a0a",
          }}
        />
        <div className="absolute inset-0 bg-stars"></div>
      </div>

      {/* Floating Elements */}
      <FloatingElements />

      {/* Main Content */}
      <div className="relative z-20">
        {isAuthenticated ? (
          <MainApp />
        ) : (
          <AuthWrapper onComingSoon={() => setShowComingSoon(true)} />
        )}
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
      />
    </div>
  );
}
