import { useState } from "react";
import Navigation from "./Navigation";
import HomeTab from "./tabs/HomeTab";
import DashboardTab from "./tabs/DashboardTab";
import TasksTab from "./tabs/TasksTab";
import WishlistTab from "./tabs/WishlistTab";
import AirdropTab from "./tabs/AirdropTab";
import PaymentModal from "./modals/PaymentModal";

export default function MainApp() {
  const [activeTab, setActiveTab] = useState("home");
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    nftType: string;
    price: number;
  }>({
    isOpen: false,
    nftType: "",
    price: 0,
  });

  const handleReserveNFT = (nftType: string, price: number) => {
    setPaymentModal({
      isOpen: true,
      nftType,
      price,
    });
  };

  const handleClosePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      nftType: "",
      price: 0,
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab />;
      case "dashboard":
        return <DashboardTab />;
      case "tasks":
        return <TasksTab />;
      case "wishlist":
        return <WishlistTab onReserveNFT={handleReserveNFT} />;
      case "airdrop":
        return <AirdropTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="container mx-auto px-4 py-8">
        {renderTabContent()}
      </main>

      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={handleClosePaymentModal}
        nftType={paymentModal.nftType}
        price={paymentModal.price}
      />
    </>
  );
}
