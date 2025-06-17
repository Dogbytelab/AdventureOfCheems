import { createContext, useContext, useState, ReactNode } from 'react';

interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendTransaction: (recipientAddress: string, amount: number) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const connect = async () => {
    try {
      // Check if Phantom wallet is available
      const { solana } = window as any;
      
      if (solana?.isPhantom) {
        const response = await solana.connect();
        setPublicKey(response.publicKey.toString());
        setConnected(true);
      } else {
        // Fallback: Open Phantom wallet website
        window.open('https://phantom.app/', '_blank');
        throw new Error('Please install Phantom wallet');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnect = () => {
    setConnected(false);
    setPublicKey(null);
  };

  const sendTransaction = async (recipientAddress: string, amount: number): Promise<string> => {
    try {
      const { solana } = window as any;
      
      if (!solana?.isPhantom) {
        throw new Error('Phantom wallet not found');
      }

      // Convert USD to SOL (approximate rate - you should get real-time rates)
      const solPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        .then(res => res.json())
        .then(data => data.solana.usd);
      
      const solAmount = amount / solPrice;
      const lamports = Math.floor(solAmount * 1000000000); // Convert SOL to lamports

      // Create transaction
      const transaction = {
        to: recipientAddress,
        value: lamports,
        currency: 'SOL'
      };

      const { signature } = await solana.request({
        method: 'signAndSendTransaction',
        params: {
          message: `Send ${solAmount.toFixed(4)} SOL ($${amount} USD) to ${recipientAddress}`,
          transaction
        }
      });

      return signature;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider value={{
      connected,
      publicKey,
      connect,
      disconnect,
      sendTransaction
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}