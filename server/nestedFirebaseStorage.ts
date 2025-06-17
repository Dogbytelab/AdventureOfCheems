
import { 
  ref, 
  set, 
  get, 
  push, 
  query, 
  orderByChild, 
  equalTo,
  update,
  child,
  serverTimestamp
} from "firebase/database";
import { rtdb } from "./firebase";
import { 
  type User, 
  type Task, 
  type UserTask, 
  type NFTReservation 
} from "@shared/schema";
import type { IStorage } from "./storage";

export class NestedFirebaseStorage implements IStorage {
  
  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const users: User[] = [];
        
        Object.entries(usersData).forEach(([uid, data]: [string, any]) => {
          users.push({
            id: uid,
            uid: uid,
            email: data.auth?.email || '',
            referralCode: data.referral?.code || '',
            inviteCode: data.referral?.invitedBy || null,
            aocPoints: data.aocPoints?.total || 0,
            inviteCount: data.referral?.inviteCount || 0,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
          });
        });
        
        return users;
      }
      return [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        console.log('Raw user data from Firebase:', userData);
        
        return {
          id: uid,
          uid: uid,
          email: userData.auth?.email || '',
          referralCode: userData.referral?.code || '',
          inviteCode: userData.referral?.invitedBy || null,
          aocPoints: userData.aocPoints?.total || 0,
          inviteCount: userData.referral?.inviteCount || 0,
          createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date()
        };
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user by UID:', error);
      return undefined;
    }
  }

  async createUser(userData: {
    uid: string;
    email: string;
    referralCode: string;
    inviteCode?: string | null;
  }): Promise<User> {
    try {
      const userRef = ref(rtdb, `users/${userData.uid}`);
      
      const nestedUserData = {
        auth: {
          email: userData.email,
          displayName: userData.email.split('@')[0]
        },
        referral: {
          code: userData.referralCode,
          invitedBy: userData.inviteCode || null,
          inviteCount: 0
        },
        aocPoints: {
          total: 0
        },
        tasks: {
          followInsta: false,
          followX: false,
          joinTelegram: false
        },
        wishlist: {
          type: null,
          amount: null,
          txHash: null,
          confirmed: false,
          timestamp: null
        },
        createdAt: Date.now()
      };
      
      await set(userRef, nestedUserData);
      
      return {
        id: userData.uid,
        uid: userData.uid,
        email: userData.email,
        referralCode: userData.referralCode,
        inviteCode: userData.inviteCode || null,
        aocPoints: 0,
        inviteCount: 0,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async generateReferralCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    do {
      result = '';
      for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const codeExists = Object.values(usersData).some((user: any) => 
          user.referral?.code === result
        );
        if (!codeExists) break;
      } else {
        break;
      }
    } while (true);
    
    return result;
  }

  async incrementInviteCount(referralCode: string): Promise<void> {
    try {
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        
        Object.entries(usersData).forEach(async ([userId, userData]: [string, any]) => {
          if (userData.referral?.code === referralCode) {
            const currentInviteCount = userData.referral?.inviteCount || 0;
            const currentPoints = userData.aocPoints?.total || 0;
            
            await update(ref(rtdb, `users/${userId}/referral`), {
              inviteCount: currentInviteCount + 1
            });
            
            await update(ref(rtdb, `users/${userId}/aocPoints`), {
              total: currentPoints + 100
            });
          }
        });
      }
    } catch (error) {
      console.error('Error incrementing invite count:', error);
    }
  }

  async getAllTasks(): Promise<Task[]> {
    try {
      const tasksRef = ref(rtdb, 'tasks');
      const snapshot = await get(tasksRef);
      
      if (snapshot.exists()) {
        const tasksData = snapshot.val();
        const tasks: Task[] = [];
        
        Object.entries(tasksData).forEach(([id, data]: [string, any]) => {
          tasks.push({
            id: id,
            ...data
          });
        });
        
        return tasks;
      }
      
      await this.initializeDefaultTasks();
      const newSnapshot = await get(tasksRef);
      const tasksData = newSnapshot.val();
      const tasks: Task[] = [];
      
      Object.entries(tasksData).forEach(([id, data]: [string, any]) => {
        tasks.push({
          id: id,
          ...data
        });
      });
      
      return tasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  private async initializeDefaultTasks(): Promise<void> {
    const defaultTasks = [
      {
        name: "Follow on X",
        description: "Follow our official X account",
        platform: "twitter",
        url: "https://x.com/DogByteLabz",
        points: 1000,
        isActive: true,
      },
      {
        name: "Follow on Instagram",
        description: "Follow our Instagram for updates",
        platform: "instagram",
        url: "https://instagram.com/aoc.offical",
        points: 1000,
        isActive: true,
      },
      {
        name: "Join Telegram",
        description: "Join our official Telegram channel",
        platform: "telegram",
        url: "https://t.me/AOCoffical",
        points: 1000,
        isActive: true,
      },
    ];

    const tasksRef = ref(rtdb, 'tasks');
    for (const taskData of defaultTasks) {
      const newTaskRef = push(tasksRef);
      const task: Task = {
        id: newTaskRef.key!,
        ...taskData,
      };
      await set(newTaskRef, task);
    }
  }

  async getUserTasks(userId: string): Promise<UserTask[]> {
    try {
      const userTasksRef = ref(rtdb, 'userTasks');
      const snapshot = await get(userTasksRef);
      
      if (snapshot.exists()) {
        const userTasksData = snapshot.val();
        const userTasks: UserTask[] = [];
        
        Object.entries(userTasksData).forEach(([id, data]: [string, any]) => {
          if (data.userId === userId) {
            userTasks.push({
              id: id,
              userId: data.userId,
              taskId: data.taskId,
              completed: data.completed || false,
              completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
              claimed: data.claimed || false,
              claimedAt: data.claimedAt ? new Date(data.claimedAt) : undefined
            });
          }
        });
        
        return userTasks;
      }
      return [];
    } catch (error) {
      console.error('Error getting user tasks:', error);
      return [];
    }
  }

  async completeTask(userUid: string, taskId: string): Promise<UserTask> {
    try {
      const user = await this.getUserByUid(userUid);
      if (!user) {
        throw new Error('User not found');
      }
      
      const userTasksRef = ref(rtdb, 'userTasks');
      const newUserTaskRef = push(userTasksRef);
      
      const userTask: UserTask = {
        id: newUserTaskRef.key!,
        userId: user.id,
        taskId,
        completed: true,
        completedAt: new Date(),
      };
      
      await set(newUserTaskRef, userTask);
      await this.updateUserPoints(userUid, 1000);
      
      return userTask;
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  async claimTaskReward(userUid: string, taskId: string): Promise<UserTask> {
    try {
      const userTasks = await this.getUserTasks(userUid);
      const userTask = userTasks.find(ut => ut.taskId === taskId && ut.completed && !ut.claimed);
      
      if (!userTask) {
        throw new Error('Task not found or already claimed');
      }
      
      await update(ref(rtdb, `userTasks/${userTask.id}`), {
        claimed: true,
        claimedAt: Date.now()
      });
      
      return {
        ...userTask,
        claimed: true,
        claimedAt: new Date()
      };
    } catch (error) {
      console.error('Error claiming task reward:', error);
      throw error;
    }
  }

  async createNFTReservation(reservation: {
    userId: string;
    nftType: string;
    price: number;
    txHash: string;
    walletAddress: string;
    solAmount: string;
  }): Promise<NFTReservation> {
    try {
      const reservationId = `${Date.now()}_${reservation.userId}`;
      
      await set(ref(rtdb, `nft_reservations/${reservationId}`), {
        userId: reservation.userId,
        nftType: reservation.nftType,
        price: reservation.price,
        txHash: reservation.txHash,
        walletAddress: reservation.walletAddress,
        solAmount: reservation.solAmount,
        verified: false,
        verificationAttempts: 0,
        createdAt: Date.now()
      });

      await update(ref(rtdb, `users/${reservation.userId}/wishlist`), {
        type: reservation.nftType,
        amount: reservation.price,
        txHash: reservation.txHash,
        confirmed: false,
        timestamp: Date.now()
      });

      return {
        id: reservationId,
        userId: reservation.userId,
        nftType: reservation.nftType,
        price: reservation.price,
        txHash: reservation.txHash,
        walletAddress: reservation.walletAddress,
        solAmount: reservation.solAmount,
        verified: false,
        verificationAttempts: 0,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating NFT reservation:', error);
      throw error;
    }
  }

  async getNFTReservations(userId: string): Promise<NFTReservation[]> {
    try {
      const userReservations: NFTReservation[] = [];
      
      const reservationsRef = ref(rtdb, 'nft_reservations');
      const reservationsSnapshot = await get(reservationsRef);
      
      if (reservationsSnapshot.exists()) {
        const reservationsData = reservationsSnapshot.val();
        
        Object.entries(reservationsData).forEach(([id, data]: [string, any]) => {
          if (data.userId === userId) {
            userReservations.push({
              id: id,
              userId: data.userId,
              nftType: data.nftType,
              price: data.price,
              txHash: data.txHash,
              walletAddress: data.walletAddress || '',
              solAmount: data.solAmount || '0',
              verified: data.verified || false,
              verificationAttempts: data.verificationAttempts || 0,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
            });
          }
        });
      }
      
      const wishlistRef = ref(rtdb, `users/${userId}/wishlist`);
      const wishlistSnapshot = await get(wishlistRef);
      
      if (wishlistSnapshot.exists()) {
        const wishlist = wishlistSnapshot.val();
        if (wishlist.type && wishlist.txHash) {
          const existingReservation = userReservations.find(r => r.txHash === wishlist.txHash);
          if (!existingReservation) {
            userReservations.push({
              id: `${userId}_wishlist`,
              userId: userId,
              nftType: wishlist.type,
              price: wishlist.amount || 1,
              txHash: wishlist.txHash,
              walletAddress: '',
              solAmount: '0',
              verified: wishlist.confirmed || false,
              verificationAttempts: 0,
              createdAt: wishlist.timestamp ? new Date(wishlist.timestamp) : new Date()
            });
          }
        }
      }
      
      return userReservations;
    } catch (error) {
      console.error('Error getting NFT reservations:', error);
      return [];
    }
  }

  async getAllNFTReservations(): Promise<NFTReservation[]> {
    try {
      const reservationsRef = ref(rtdb, 'nft_reservations');
      const snapshot = await get(reservationsRef);
      
      if (snapshot.exists()) {
        const reservationsData = snapshot.val();
        const reservations: NFTReservation[] = [];
        
        Object.entries(reservationsData).forEach(([id, data]: [string, any]) => {
          reservations.push({
            id: id,
            userId: data.userId,
            nftType: data.nftType,
            price: data.price,
            txHash: data.txHash,
            walletAddress: data.walletAddress || '',
            solAmount: data.solAmount || '0',
            verified: data.verified || false,
            verificationAttempts: data.verificationAttempts || 0,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
          });
        });
        
        return reservations;
      }
      return [];
    } catch (error) {
      console.error('Error getting all NFT reservations:', error);
      return [];
    }
  }

  async isTransactionHashUsed(txHash: string): Promise<boolean> {
    try {
      const reservationsRef = ref(rtdb, 'nft_reservations');
      const snapshot = await get(reservationsRef);
      
      if (snapshot.exists()) {
        const reservationsData = snapshot.val();
        return Object.values(reservationsData).some((data: any) => data.txHash === txHash);
      }
      return false;
    } catch (error) {
      console.error('Error checking transaction hash:', error);
      return false;
    }
  }

  async getNFTReservationCountByType(nftType: string): Promise<number> {
    try {
      const reservationsRef = ref(rtdb, 'nft_reservations');
      const snapshot = await get(reservationsRef);
      
      if (snapshot.exists()) {
        const reservationsData = snapshot.val();
        return Object.values(reservationsData).filter((data: any) => 
          data.nftType.toLowerCase() === nftType.toLowerCase()
        ).length;
      }
      return 0;
    } catch (error) {
      console.error('Error getting NFT reservation count by type:', error);
      return 0;
    }
  }

  async getUserNFTReservationsByType(userUid: string, nftType: string): Promise<NFTReservation[]> {
    try {
      const reservationsRef = ref(rtdb, 'nft_reservations');
      const snapshot = await get(reservationsRef);
      
      if (snapshot.exists()) {
        const reservationsData = snapshot.val();
        const userReservations: NFTReservation[] = [];
        
        Object.entries(reservationsData).forEach(([id, data]: [string, any]) => {
          if (data.userId === userUid && data.nftType.toLowerCase() === nftType.toLowerCase()) {
            userReservations.push({
              id: id,
              userId: data.userId,
              nftType: data.nftType,
              price: data.price,
              txHash: data.txHash,
              walletAddress: data.walletAddress || '',
              solAmount: data.solAmount || '0',
              verified: data.verified || false,
              verificationAttempts: data.verificationAttempts || 0,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
            });
          }
        });
        
        return userReservations;
      }
      return [];
    } catch (error) {
      console.error('Error getting user NFT reservations by type:', error);
      return [];
    }
  }

  async updateUserPoints(userUid: string, pointsToAdd: number): Promise<void> {
    try {
      const userRef = ref(rtdb, `users/${userUid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const currentPoints = userData.aocPoints?.total || 0;
        
        await update(ref(rtdb, `users/${userUid}/aocPoints`), {
          total: currentPoints + pointsToAdd
        });
      }
    } catch (error) {
      console.error('Error updating user points:', error);
    }
  }
}

export const nestedFirebaseStorage = new NestedFirebaseStorage();
