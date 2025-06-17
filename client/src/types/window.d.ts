// Global window type definitions for Solana wallets
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      signTransaction: (transaction: any) => Promise<any>;
      signAndSendTransaction: (transaction: any) => Promise<{ signature: string }>;
      request: (params: any) => Promise<any>;
    };
    
    solflare?: {
      isSolflare?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      signTransaction: (transaction: any) => Promise<any>;
    };
    
    backpack?: {
      isBackpack?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      signTransaction: (transaction: any) => Promise<any>;
    };
    
    Buffer?: any;
  }
}

export {};