export interface SolanaTransactionVerification {
  valid: boolean;
  error?: string;
  amount?: number;
  recipient?: string;
  timestamp?: number;
}

// Validate Base58 format for Solana transaction hash
function isValidBase58TxHash(txHash: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(txHash);
}

export async function verifySolanaTransaction(
  txHash: string,
  expectedAmount: number,
  expectedRecipient: string = "BmzAXDfy6rvSgj4BiZ7R8eEr83S2VpCMKVYwZ3EdgTnp"
): Promise<SolanaTransactionVerification> {
  try {
    // First validate the transaction hash format
    if (!isValidBase58TxHash(txHash)) {
      return { 
        valid: false, 
        error: "Invalid Transaction Hash format. Please ensure you're using a valid Solana transaction hash." 
      };
    }
    // Using Solana mainnet RPC
    const rpcUrl = "https://api.mainnet-beta.solana.com";
    
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          txHash,
          {
            encoding: "json",
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return { valid: false, error: "Transaction not found" };
    }

    const transaction = data.result;
    if (!transaction) {
      return { valid: false, error: "Transaction not found" };
    }

    // Check if transaction is recent (within last 15 minutes)
    const txTimestamp = transaction.blockTime * 1000;
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    
    if (now - txTimestamp > fifteenMinutes) {
      return { valid: false, error: "Transaction is too old" };
    }

    // Get transaction details
    const preBalances = transaction.meta.preBalances;
    const postBalances = transaction.meta.postBalances;
    const accountKeys = transaction.transaction.message.accountKeys;

    // Find the recipient account index
    const recipientIndex = accountKeys.findIndex((key: string) => key === expectedRecipient);
    if (recipientIndex === -1) {
      return { valid: false, error: "Recipient wallet not found in transaction" };
    }

    // Calculate the amount transferred to recipient
    const balanceChange = postBalances[recipientIndex] - preBalances[recipientIndex];
    const solAmount = balanceChange / 1000000000; // Convert lamports to SOL

    // Get current SOL/USD price (simplified - in production, use a proper price API)
    const solPrice = await getCurrentSOLPrice();
    const usdAmount = solAmount * solPrice;

    // Allow 5% tolerance for price fluctuations
    const tolerance = 0.05;
    const minAmount = expectedAmount * (1 - tolerance);
    const maxAmount = expectedAmount * (1 + tolerance);

    if (usdAmount < minAmount || usdAmount > maxAmount) {
      return { 
        valid: false, 
        error: `Amount mismatch. Expected: $${expectedAmount}, Received: $${usdAmount.toFixed(2)}` 
      };
    }

    return {
      valid: true,
      amount: usdAmount,
      recipient: expectedRecipient,
      timestamp: txTimestamp,
    };

  } catch (error) {
    console.error("Transaction verification error:", error);
    return { valid: false, error: "Failed to verify transaction" };
  }
}

async function getCurrentSOLPrice(): Promise<number> {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error("Failed to get SOL price:", error);
    // Fallback price (should be updated regularly in production)
    return 100; // $100 per SOL as fallback
  }
}
