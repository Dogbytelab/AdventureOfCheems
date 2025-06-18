import { 
  ref, 
  get, 
  set 
} from "firebase/database";
import { rtdb } from "./firebase";

export interface NFTTxHashReservation {
  userId: string;
  nftType: "NORMIE" | "SIGMA" | "CHAD";
  timestamp: number;
}

export class NFTTxHashStorage {
  
  /**
   * Reserve an NFT with transaction hash as key
   * Throws error if transaction hash already exists
   */
  async reserveNFT(txHash: string, userId: string, nftType: "NORMIE" | "SIGMA" | "CHAD"): Promise<void> {
    const txRef = ref(rtdb, `nft_txHashes/${txHash}`);
    const snapshot = await get(txRef);

    if (snapshot.exists()) {
      throw new Error("Transaction already used");
    }

    await set(txRef, {
      userId: userId,
      nftType: nftType,
      timestamp: Date.now()
    });
  }

  /**
   * Check if a transaction hash is already used
   */
  async isTransactionHashUsed(txHash: string): Promise<boolean> {
    const txRef = ref(rtdb, `nft_txHashes/${txHash}`);
    const snapshot = await get(txRef);
    return snapshot.exists();
  }

  /**
   * Get all reservations for a specific user
   */
  async getUserReservations(userId: string): Promise<Array<{txHash: string, nftType: string, timestamp: number}>> {
    const txHashesRef = ref(rtdb, 'nft_txHashes');
    const snapshot = await get(txHashesRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const allReservations = snapshot.val();
    const userReservations: Array<{txHash: string, nftType: string, timestamp: number}> = [];

    Object.entries(allReservations).forEach(([txHash, data]: [string, any]) => {
      if (data.userId === userId) {
        userReservations.push({
          txHash: txHash,
          nftType: data.nftType,
          timestamp: data.timestamp
        });
      }
    });

    return userReservations;
  }

  /**
   * Get all reservations for a specific NFT type
   */
  async getReservationsByNFTType(nftType: string): Promise<Array<{txHash: string, userId: string, timestamp: number}>> {
    const txHashesRef = ref(rtdb, 'nft_txHashes');
    const snapshot = await get(txHashesRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const allReservations = snapshot.val();
    const typeReservations: Array<{txHash: string, userId: string, timestamp: number}> = [];

    Object.entries(allReservations).forEach(([txHash, data]: [string, any]) => {
      if (data.nftType.toLowerCase() === nftType.toLowerCase()) {
        typeReservations.push({
          txHash: txHash,
          userId: data.userId,
          timestamp: data.timestamp
        });
      }
    });

    return typeReservations;
  }

  /**
   * Get count of reservations by NFT type
   */
  async getNFTReservationCountByType(nftType: string): Promise<number> {
    const reservations = await this.getReservationsByNFTType(nftType);
    return reservations.length;
  }

  /**
   * Get user's reservations for a specific NFT type
   */
  async getUserNFTReservationsByType(userId: string, nftType: string): Promise<Array<{txHash: string, timestamp: number}>> {
    const txHashesRef = ref(rtdb, 'nft_txHashes');
    const snapshot = await get(txHashesRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const allReservations = snapshot.val();
    const userTypeReservations: Array<{txHash: string, timestamp: number}> = [];

    Object.entries(allReservations).forEach(([txHash, data]: [string, any]) => {
      if (data.userId === userId && data.nftType.toLowerCase() === nftType.toLowerCase()) {
        userTypeReservations.push({
          txHash: txHash,
          timestamp: data.timestamp
        });
      }
    });

    return userTypeReservations;
  }

  /**
   * Get all reservations (for admin purposes)
   */
  async getAllReservations(): Promise<Record<string, NFTTxHashReservation>> {
    const txHashesRef = ref(rtdb, 'nft_txHashes');
    const snapshot = await get(txHashesRef);
    
    if (!snapshot.exists()) {
      return {};
    }

    return snapshot.val();
  }
}

export const nftTxHashStorage = new NFTTxHashStorage();