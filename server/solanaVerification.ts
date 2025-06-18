import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface SolanaTransactionVerification {
  valid: boolean;
  error?: string;
  amount?: number;
  recipient?: string;
  timestamp?: number;
  walletAddress?: string;
}

const RECIPIENT_WALLET = "BmzAXDfy6rvSgj4BiZ7R8eEr83S2VpCMKVYwZ3EdgTnp";
const TOLERANCE_PERCENT = 0.05; // 5% tolerance for price fluctuation
const MAX_TRANSACTION_AGE_MINUTES = 15;

// Use mainnet for production
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

export async function getCurrentSOLPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const price = data.solana?.usd;
    if (!price || typeof price !== 'number' || price <= 0) {
      throw new Error('Invalid price data received');
    }
    return price;
  } catch (error) {
    console.error('Failed to fetch SOL price:', error);
    // Return a reasonable fallback price instead of throwing
    return 100;
  }
}

export function calculateSOLAmount(usdAmount: number, solPrice: number): number {
  if (!usdAmount || !solPrice || usdAmount <= 0 || solPrice <= 0) {
    throw new Error('Invalid USD amount or SOL price');
  }
  return usdAmount / solPrice;
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
    const expectedSOLAmount = calculateSOLAmount(expectedAmountUSD, solPrice);

    // Verify transaction on-chain
    const transaction = await connection.getTransaction(txHash, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      return {
        valid: false,
        error: "Transaction not found on blockchain. Please ensure the transaction is confirmed.",
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

    console.log(`Transaction verification details:
      Expected SOL: ${expectedSOLAmount.toFixed(4)}
      Actual SOL: ${actualSOL.toFixed(4)}
      Min allowed: ${minAmount.toFixed(4)}
      Max allowed: ${maxAmount.toFixed(4)}
      USD Amount: $${expectedAmountUSD}
      SOL Price: $${solPrice.toFixed(2)}`);

    if (actualSOL < minAmount || actualSOL > maxAmount) {
      return {
        valid: false,
        error: `Incorrect SOL amount. Expected: ${expectedSOLAmount.toFixed(4)} SOL (±${(tolerance * 100).toFixed(1)}%), Actual: ${actualSOL.toFixed(4)} SOL. USD: $${expectedAmountUSD} at $${solPrice.toFixed(2)}/SOL`,
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
      error: error instanceof Error ? error.message : "Failed to verify transaction on blockchain",
    };
  }
}