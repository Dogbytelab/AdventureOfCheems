import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface SolanaTransactionVerification {
  valid: boolean;
  error?: string;
  amount?: number;
  recipient?: string;
  timestamp?: number;
  walletAddress?: string;
}

export interface NFTLimits {
  NORMIE: number;
  SIGMA: number;
  CHAD: number;
}

export const NFT_LIMITS: NFTLimits = {
  NORMIE: 25,
  SIGMA: 5,
  CHAD: 1
};

export const NFT_PRICES = {
  NORMIE: 25,
  SIGMA: 100,
  CHAD: 500
};

const RECIPIENT_WALLET = "BmzAXDfy6rvSgj4BiZ7R8eEr83S2VpCMKVYwZ3EdgTnp";
const TOLERANCE_PERCENT = 0.05; // 5% tolerance for price fluctuation
const MAX_TRANSACTION_AGE_MINUTES = 15;

// Use mainnet-beta for production
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

// Supported wallet types
export enum WalletType {
  PHANTOM = 'phantom',
  SOLFLARE = 'solflare',
  BACKPACK = 'backpack',
  SOLLET = 'sollet',
  UNKNOWN = 'unknown'
}

export interface WalletAdapter {
  publicKey: PublicKey | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (transaction: any) => Promise<{ signature: string }>;
  signTransaction?: (transaction: any) => Promise<any>;
  signAllTransactions?: (transactions: any[]) => Promise<any[]>;
}

// Detect available Solana wallets
export function detectAvailableWallets(): { type: WalletType; name: string; adapter: any }[] {
  const wallets: { type: WalletType; name: string; adapter: any }[] = [];

  if (typeof window !== 'undefined') {
    const windowAny = window as any;

    // Phantom
    if (windowAny.solana && windowAny.solana.isPhantom) {
      wallets.push({
        type: WalletType.PHANTOM,
        name: 'Phantom',
        adapter: windowAny.solana
      });
    }

    // Solflare
    if (windowAny.solflare && windowAny.solflare.isSolflare) {
      wallets.push({
        type: WalletType.SOLFLARE,
        name: 'Solflare',
        adapter: windowAny.solflare
      });
    }

    // Backpack
    if (windowAny.backpack && windowAny.backpack.isBackpack) {
      wallets.push({
        type: WalletType.BACKPACK,
        name: 'Backpack',
        adapter: windowAny.backpack
      });
    }

    // Sollet (Sollet.io)
    if (windowAny.sollet) {
      wallets.push({
        type: WalletType.SOLLET,
        name: 'Sollet',
        adapter: windowAny.sollet
      });
    }
  }

  return wallets;
}

// Get the best available wallet (prioritize Phantom, then others)
export function getBestAvailableWallet(): { type: WalletType; name: string; adapter: any } | null {
  const wallets = detectAvailableWallets();

  if (wallets.length === 0) return null;

  // Prioritize Phantom
  const phantom = wallets.find(w => w.type === WalletType.PHANTOM);
  if (phantom) return phantom;

  // Return first available wallet
  return wallets[0];
}

export async function isValidBase58TxHash(txHash: string): Promise<boolean> {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;
  return base58Regex.test(txHash);
}

export async function getCurrentSOLPrice(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { 
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.solana || !data.solana.usd) {
      throw new Error('Invalid price data received');
    }
    
    return data.solana.usd;
  } catch (error) {
    console.error("Failed to fetch SOL price:", error);
    throw new Error("Unable to fetch current SOL price. Please try again.");
  }
}

export async function verifySolanaTransaction(
  txHash: string,
  expectedAmountUSD: number,
  nftType: string
): Promise<SolanaTransactionVerification> {
  if (!await isValidBase58TxHash(txHash)) {
    return {
      valid: false,
      error: "Invalid transaction hash format",
    };
  }

  try {
    // Get current SOL price
    const solPrice = await getCurrentSOLPrice();
    const expectedSOLAmount = expectedAmountUSD / solPrice;
    
    // Verify transaction on-chain
    const transaction = await connection.getTransaction(txHash, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      return {
        valid: false,
        error: "Transaction not found on blockchain",
      };
    }

    // Check transaction age (within 15 minutes)
    const transactionTime = transaction.blockTime ? transaction.blockTime * 1000 : 0;
    const currentTime = Date.now();
    const ageMinutes = (currentTime - transactionTime) / (1000 * 60);
    
    if (ageMinutes > MAX_TRANSACTION_AGE_MINUTES) {
      return {
        valid: false,
        error: `Transaction is too old (${Math.round(ageMinutes)} minutes). Must be within ${MAX_TRANSACTION_AGE_MINUTES} minutes.`,
      };
    }

    // Verify transaction was successful
    if (transaction.meta?.err) {
      return {
        valid: false,
        error: "Transaction failed on blockchain",
      };
    }

    const preBalances = transaction.meta?.preBalances || [];
    const postBalances = transaction.meta?.postBalances || [];
    const accountKeys = transaction.transaction.message.staticAccountKeys || [];

    // Find recipient account index
    const recipientPubkey = new PublicKey(RECIPIENT_WALLET);
    const recipientIndex = accountKeys.findIndex(key => key.equals(recipientPubkey));
    
    if (recipientIndex === -1) {
      return {
        valid: false,
        error: "Transaction does not involve the correct recipient wallet",
      };
    }

    // Calculate actual SOL amount transferred
    const preBalance = preBalances[recipientIndex] || 0;
    const postBalance = postBalances[recipientIndex] || 0;
    const actualLamports = postBalance - preBalance;
    const actualSOL = actualLamports / LAMPORTS_PER_SOL;

    // Verify amount (with tolerance)
    const tolerance = expectedSOLAmount * TOLERANCE_PERCENT;
    const minAmount = expectedSOLAmount - tolerance;
    const maxAmount = expectedSOLAmount + tolerance;

    if (actualSOL < minAmount || actualSOL > maxAmount) {
      return {
        valid: false,
        error: `Incorrect SOL amount. Expected: ${expectedSOLAmount.toFixed(4)}, Actual: ${actualSOL.toFixed(4)}`,
      };
    }

    // Get sender wallet address
    const senderIndex = 0; // First account is usually the sender
    const senderPubkey = accountKeys[senderIndex];

    return {
      valid: true,
      amount: actualSOL,
      recipient: RECIPIENT_WALLET,
      timestamp: transactionTime,
      walletAddress: senderPubkey.toString(),
    };

  } catch (error) {
    console.error("Transaction verification error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Failed to verify transaction",
    };
  }
}

export function calculateSOLAmount(usdAmount: number, solPrice: number): number {
  return usdAmount / solPrice;
}

export function validateNFTLimits(nftType: string, currentCount: number): boolean {
  const limit = NFT_LIMITS[nftType.toUpperCase() as keyof NFTLimits];
  return currentCount < limit;
}

// Connect to any available Solana wallet
export async function connectSolanaWallet(): Promise<{ publicKey: string; connected: boolean; walletName: string }> {
  try {
    const wallet = getBestAvailableWallet();
    
    if (!wallet) {
      throw new Error('No Solana wallet found. Please install a supported wallet like Phantom, Solflare, or Backpack.');
    }

    console.log(`Connecting to ${wallet.name} wallet...`);
    
    let response;
    
    // Handle different wallet connection methods
    if (wallet.type === WalletType.PHANTOM || wallet.type === WalletType.SOLFLARE) {
      response = await wallet.adapter.connect();
    } else if (wallet.type === WalletType.BACKPACK) {
      response = await wallet.adapter.connect();
    } else {
      // Generic connection attempt
      response = await wallet.adapter.connect();
    }
    
    return {
      publicKey: response.publicKey.toString(),
      connected: true,
      walletName: wallet.name
    };
  } catch (error) {
    console.error('Failed to connect to Solana wallet:', error);
    throw error;
  }
}

// Legacy function for backward compatibility
export async function connectPhantomWallet(): Promise<{ publicKey: string; connected: boolean }> {
  const result = await connectSolanaWallet();
  return {
    publicKey: result.publicKey,
    connected: result.connected
  };
}

// Send SOL transaction via any connected Solana wallet
export async function sendSOLTransaction(
  recipientAddress: string,
  amountSOL: number
): Promise<string> {
  try {
    const wallet = getBestAvailableWallet();
    
    if (!wallet) {
      throw new Error('No Solana wallet found. Please install a supported wallet.');
    }

    if (!wallet.adapter.connected) {
      throw new Error(`${wallet.name} wallet is not connected. Please connect your wallet first.`);
    }

    console.log(`Initiating transaction: ${amountSOL.toFixed(4)} SOL to ${recipientAddress} via ${wallet.name}`);

    let transaction;
    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

    try {
      // Try standard method for most wallets
      if (wallet.type === WalletType.PHANTOM) {
        transaction = await wallet.adapter.request({
          method: "signAndSendTransaction",
          params: {
            message: `NFT Reservation Payment - ${amountSOL.toFixed(4)} SOL`,
            transaction: {
              to: recipientAddress,
              value: lamports,
            }
          }
        });
      } else if (wallet.type === WalletType.SOLFLARE) {
        // Solflare specific transaction format
        transaction = await wallet.adapter.signAndSendTransaction({
          to: new PublicKey(recipientAddress),
          value: lamports,
          message: `NFT Reservation Payment - ${amountSOL.toFixed(4)} SOL`
        });
      } else if (wallet.type === WalletType.BACKPACK) {
        // Backpack specific transaction format
        transaction = await wallet.adapter.signAndSendTransaction({
          instructions: [{
            programId: new PublicKey("11111111111111111111111111111112"), // System program
            keys: [
              { pubkey: wallet.adapter.publicKey, isSigner: true, isWritable: true },
              { pubkey: new PublicKey(recipientAddress), isSigner: false, isWritable: true }
            ],
            data: Buffer.from([2, 0, 0, 0, ...new Uint8Array(new BigUint64Array([BigInt(lamports)]).buffer)])
          }]
        });
      } else {
        // Generic approach for other wallets
        transaction = await wallet.adapter.signAndSendTransaction({
          to: recipientAddress,
          value: lamports,
        });
      }
    } catch (error: any) {
      console.error(`${wallet.name} transaction request failed:`, error);
      if (error.message?.includes('User rejected') || error.message?.includes('cancelled')) {
        throw new Error('Transaction was cancelled by user');
      }
      if (error.message?.includes('Insufficient funds') || error.message?.includes('insufficient')) {
        throw new Error('Insufficient SOL balance in wallet');
      }
      throw new Error(`Transaction failed: ${error.message || 'Unknown error'}`);
    }

    const signature = transaction?.signature || transaction?.transactionSignature || transaction;

    if (!signature) {
      throw new Error('Transaction failed: No signature returned');
    }

    console.log(`Transaction successful via ${wallet.name}:`, signature);
    return signature;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}