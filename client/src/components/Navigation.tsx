import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase";
import logoImage from "@assets/logo_1750165292012.png";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { firebaseUser } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const tabs = [
    { id: "home", label: "HOME", icon: "🏠" },
    { id: "dashboard", label: "DASHBOARD", icon: "📊" },
    { id: "tasks", label: "TASKS", icon: "✅" },
    { id: "wishlist", label: "WISHLIST NFT", icon: "⭐" },
    { id: "airdrop", label: "AIRDROP", icon: "🪂" },
  ];

  return (
    <>
      {/* Header */}
      <header className="glass-effect border-b border-gray-700/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img
                src={logoImage}
                alt="DogByte Lab"
                className="w-10 h-10"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="font-retro text-accent text-xl">DOGBYTE LAB</span>
            </div>
            
            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm text-text-secondary">Welcome back!</div>
                <div className="text-accent font-bold">{firebaseUser?.email}</div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-gray-600 hover:bg-gray-700 border-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="glass-effect border-b border-gray-700/50">
        <div className="container mx-auto px-4">
          <div className="flex justify-center space-x-2 md:space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 md:px-6 py-3 font-retro text-xs md:text-sm transition-all duration-300 border-b-2 ${
                  activeTab === tab.id
                    ? "border-accent text-accent"
                    : "border-transparent text-text-secondary hover:text-accent"
                }`}
              >
                <span className="mr-1 md:mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
