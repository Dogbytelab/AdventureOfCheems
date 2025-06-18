import { 
  ref, 
  set, 
  get, 
  push, 
  query, 
  orderByChild, 
  equalTo,
  update,
  child
} from "firebase/database";
import { rtdb } from "./firebase";
import { 
  type User, 
  type Task, 
  type UserTask, 
  type NFTReservation 
} from "@shared/schema";

export interface IFirebaseStorage {
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(userData: {
    uid: string;
    email: string;
    referralCode: string;
    inviteCode?: string | null;
  }): Promise<User>;
  generateReferralCode(): Promise<string>;
  incrementInviteCount(referralCode: string): Promise<void>;
  
  getAllTasks(): Promise<Task[]>;
  getUserTasks(userId: string): Promise<UserTask[]>;
  getUserTask(userId: string, taskId: string): Promise<UserTask | undefined>;
  completeTask(userId: string, taskId: string): Promise<UserTask>;
  
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
  
  updateUserPoints(userId: string, points: number): Promise<void>;
}

export class FirebaseStorage implements IFirebaseStorage {
  
  async getUserByUid(uid: string): Promise<User | undefined> {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        // Convert nested structure to flat User object
        return {
          id: uid,
          uid: uid,
          email: userData.auth?.email || '',
          referralCode: userData.referral?.code || '',
          inviteCode: userData.referral?.invitedBy || null,
          aocPoints: userData.aocPoints?.total || 0,
          inviteCount: userData.referral?.inviteCount || 0,
          createdAt: new Date() // We'll need to add this to the structure
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
      
      // Return flat User object for compatibility
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
      
      // Check if code already exists
      const usersRef = ref(rtdb, 'users');
      const codeQuery = query(usersRef, orderByChild('referralCode'), equalTo(result));
      const snapshot = await get(codeQuery);
      
      if (!snapshot.exists()) {
        break;
      }
    } while (true);
    
    return result;
  }

  async incrementInviteCount(referralCode: string): Promise<void> {
    try {
      const usersRef = ref(rtdb, 'users');
      const userQuery = query(usersRef, orderByChild('referralCode'), equalTo(referralCode));
      const snapshot = await get(userQuery);
      
      if (snapshot.exists()) {
        const userId = Object.keys(snapshot.val())[0];
        const userData = Object.values(snapshot.val())[0] as User;
        
        await update(ref(rtdb, `users/${userId}`), {
          inviteCount: userData.inviteCount + 1,
          aocPoints: userData.aocPoints + 100 // +100 AOC points per invite
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
        return Object.values(snapshot.val()) as Task[];
      }
      
      // Initialize default tasks if none exist
      await this.initializeDefaultTasks();
      const newSnapshot = await get(tasksRef);
      return Object.values(newSnapshot.val()) as Task[];
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
      const userTaskQuery = query(userTasksRef, orderByChild('userId'), equalTo(userId));
      const snapshot = await get(userTaskQuery);
      
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as UserTask[];
      }
      return [];
    } catch (error) {
      console.error('Error getting user tasks:', error);
      return [];
    }
  }

  async getUserTask(userId: string, taskId: string): Promise<UserTask | undefined> {
    try {
      const userTasks = await this.getUserTasks(userId);
      return userTasks.find(ut => ut.userId === userId && ut.taskId === taskId);
    } catch (error) {
      console.error('Error getting user task:', error);
      return undefined;
    }
  }

  async completeTask(userUid: string, taskId: string): Promise<UserTask> {
    try {
      // Get user by UID to get the user ID
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
      
      // Award points to user
      await this.updateUserPoints(userUid, 1000);
      
      return userTask;
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  async createNFTReservation(reservation: {
    userId: string;
    nftType: string;
    price: number;
    txHash: string;
  }): Promise<NFTReservation> {
    try {
      // Get current wishlist data
      const wishlistRef = ref(rtdb, `users/${reservation.userId}/wishlist`);
      const snapshot = await get(wishlistRef);
      
      let wishlist = snapshot.exists() ? snapshot.val() : {
        NORMIE: 0,
        SIGMA: 0,
        CHAD: 0,
        total: 0
      };
      
      // If it's legacy format, convert it
      if (wishlist.type && wishlist.txHash) {
        const oldType = wishlist.type.toUpperCase();
        wishlist = {
          NORMIE: oldType === 'NORMIE' ? 1 : 0,
          SIGMA: oldType === 'SIGMA' ? 1 : 0,
          CHAD: oldType === 'CHAD' ? 1 : 0,
          total: 1
        };
      }
      
      // Increment count for the new reservation
      const nftTypeUpper = reservation.nftType.toUpperCase();
      if (wishlist[nftTypeUpper] !== undefined) {
        wishlist[nftTypeUpper]++;
        wishlist.total++;
      }
      
      // Update wishlist with new counting structure
      await update(wishlistRef, wishlist);
      
      // Return NFTReservation for compatibility
      return {
        id: `${reservation.userId}_wishlist`,
        userId: reservation.userId,
        nftType: reservation.nftType,
        price: reservation.price,
        txHash: reservation.txHash,
        verified: false,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating NFT reservation:', error);
      throw error;
    }
  }

  async getNFTReservations(userId: string): Promise<NFTReservation[]> {
    try {
      const reservationsRef = ref(rtdb, 'nftReservations');
      const userReservationsQuery = query(reservationsRef, orderByChild('userId'), equalTo(userId));
      const snapshot = await get(userReservationsQuery);
      
      if (snapshot.exists()) {
        return Object.values(snapshot.val()) as NFTReservation[];
      }
      return [];
    } catch (error) {
      console.error('Error getting NFT reservations:', error);
      return [];
    }
  }

  async updateUserPoints(userUid: string, pointsToAdd: number): Promise<void> {
    try {
      const usersRef = ref(rtdb, 'users');
      const userQuery = query(usersRef, orderByChild('uid'), equalTo(userUid));
      const snapshot = await get(userQuery);
      
      if (snapshot.exists()) {
        const userKey = Object.keys(snapshot.val())[0];
        const userData = Object.values(snapshot.val())[0] as User;
        
        await update(ref(rtdb, `users/${userKey}`), {
          aocPoints: userData.aocPoints + pointsToAdd
        });
      }
    } catch (error) {
      console.error('Error updating user points:', error);
    }
  }
}

export const firebaseStorage = new FirebaseStorage();