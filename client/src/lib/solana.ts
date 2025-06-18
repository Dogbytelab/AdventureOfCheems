import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';

// Ensure Buffer is available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

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
  NORMIE: 0.05,
  SIGMA: 25,
  CHAD: 269
};

const RECIPIENT_WALLET = "BmzAXDfy6rvSgj4BiZ7R8eEr83S2VpCMKVYwZ3EdgTnp";
const TOLERANCE_PERCENT = 0.05; // 5% tolerance for price fluctuation
const MAX_TRANSACTION_AGE_MINUTES = 15;

// Use mainnet for production
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

export interface WalletType {
  name: string;
  adapter: any;
  readyState: string;
}

export function detectAvailableWallets(): WalletType[] {
  const wallets: WalletType[] = [];

  if (typeof window !== 'undefined') {
    // Check for Phantom with retry logic
    try {
      if (window.solana && window.solana.isPhantom) {
        wallets.push({
          name: 'Phantom',
          adapter: window.solana,
          readyState: 'Installed'
        });
      }
    } catch (error) {
      console.warn('Error checking Phantom wallet:', error);
    }

    // Check for Solflare
    try {
      if (window.solflare && window.solflare.isSolflare) {
        wallets.push({
          name: 'Solflare',
          adapter: window.solflare,
          readyState: 'Installed'
        });
      }
    } catch (error) {
      console.warn('Error checking Solflare wallet:', error);
    }

    // Check for Backpack
    try {
      if (window.backpack && window.backpack.isBackpack) {
        wallets.push({
          name: 'Backpack',
          adapter: window.backpack,
          readyState: 'Installed'
        });
      }
    } catch (error) {
      console.warn('Error checking Backpack wallet:', error);
    }
  }

  return wallets;
}

export async function connectSolanaWallet() {
  const wallets = detectAvailableWallets();

  if (wallets.length === 0) {
    throw new Error('No Solana wallet found. Please install Phantom, Solflare, or Backpack.');
  }

  const wallet = wallets[0]; // Use the first available wallet

  try {
    await wallet.adapter.connect();
    const publicKey = wallet.adapter.publicKey?.toString();

    if (!publicKey) {
      throw new Error('Failed to get wallet public key');
    }

    return {
      connected: true,
      publicKey,
      walletName: wallet.name
    };
  } catch (error: any) {
    console.error(`Failed to connect to ${wallet.name} wallet:`, error);
    throw new Error(`Failed to connect to ${wallet.name} wallet: ${error.message}`);
  }
}

export async function connectPhantomWallet() {
  if (typeof window === 'undefined' || !window.solana) {
    throw new Error('Phantom wallet not found. Please install Phantom wallet extension.');
  }

  try {
    await window.solana.connect();
    const publicKey = window.solana.publicKey?.toString();

    if (!publicKey) {
      throw new Error('Failed to get Phantom wallet public key');
    }

    return {
      connected: true,
      publicKey,
      walletName: 'Phantom'
    };
  } catch (error: any) {
    console.error('Failed to connect to Phantom wallet:', error);
    throw new Error(`Failed to connect to Phantom wallet: ${error.message}`);
  }
}

export async function getCurrentSOLPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error('Failed to fetch SOL price:', error);
    // Fallback price if API fails
    return 100; // Default fallback price
  }
}

export function calculateSOLAmount(usdAmount: number, solPrice: number): number {
  return usdAmount / solPrice;
}

export async function sendSOLTransaction(recipient: string, amount: number): Promise<string> {
  const wallets = detectAvailableWallets();

  if (wallets.length === 0) {
    throw new Error('No wallet connected');
  }

  const wallet = wallets[0].adapter;

  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    const { Transaction, SystemProgram } = await import('@solana/web3.js');

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey(recipient),
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    await connection.confirmTransaction(signature);

    return signature;
  } catch (error: any) {
    console.error('Transaction failed:', error);
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

export async function isValidBase58TxHash(txHash: string): Promise<boolean> {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;
  return base58Regex.test(txHash);
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

export function validateNFTLimits(nftType: string, currentCount: number): boolean {
  const limit = NFT_LIMITS[nftType.toUpperCase() as keyof NFTLimits];
  return currentCount < limit;
}