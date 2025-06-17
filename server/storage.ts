import type { User, Task, UserTask, NFTReservation } from "@shared/schema";

export interface IStorage {
  // User methods
  getAllUsers(): Promise<User[]>;
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(userData: {
    uid: string;
    email: string;
    referralCode: string;
    inviteCode?: string | null;
  }): Promise<User>;
  generateReferralCode(): Promise<string>;
  incrementInviteCount(referralCode: string): Promise<void>;
  updateUserPoints(userId: string, points: number): Promise<void>;

  // Task methods
  getAllTasks(): Promise<Task[]>;
  getUserTasks(userId: string): Promise<UserTask[]>;
  completeTask(userId: string, taskId: string): Promise<UserTask>;
  claimTaskReward(userId: string, taskId: string): Promise<UserTask>;

  // NFT Reservation methods
  createNFTReservation(reservation: {
    userId: string;
    nftType: string;
    price: number;
    txHash: string;
    walletAddress: string;
    solAmount: string;
  }): Promise<NFTReservation>;
  getNFTReservations(userId: string): Promise<NFTReservation[]>;
  getAllNFTReservations(): Promise<NFTReservation[]>;
  isTransactionHashUsed(txHash: string): Promise<boolean>;
  getNFTReservationCountByType(nftType: string): Promise<number>;
  getUserNFTReservationsByType(userUid: string, nftType: string): Promise<NFTReservation[]>;
}

// Use NestedFirebaseStorage as the default storage implementation
import { nestedFirebaseStorage } from "./nestedFirebaseStorage";
export const storage: IStorage = nestedFirebaseStorage;