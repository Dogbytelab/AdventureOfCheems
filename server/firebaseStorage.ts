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
  }): Promise<NFTReservation>;
  getNFTReservations(userId: string): Promise<NFTReservation[]>;
  
  updateUserPoints(userId: string, points: number): Promise<void>;
}

export class FirebaseStorage implements IFirebaseStorage {
  
  async getUserByUid(uid: string): Promise<User | undefined> {
    try {
      console.log('Firebase config check:', {
        hasApiKey: !!process.env.FIREBASE_API_KEY,
        hasDbUrl: !!process.env.FIREBASE_DATABASE_URL,
        dbUrl: process.env.FIREBASE_DATABASE_URL?.substring(0, 30) + '...'
      });
      
      const usersRef = ref(rtdb, 'users');
      const userQuery = query(usersRef, orderByChild('uid'), equalTo(uid));
      const snapshot = await get(userQuery);
      
      if (snapshot.exists()) {
        const userData = Object.values(snapshot.val())[0] as User;
        return userData;
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
      const usersRef = ref(rtdb, 'users');
      const newUserRef = push(usersRef);
      
      const user: User = {
        id: newUserRef.key!,
        uid: userData.uid,
        email: userData.email,
        referralCode: userData.referralCode,
        inviteCode: userData.inviteCode || null,
        aocPoints: 0,
        inviteCount: 0,
        createdAt: new Date(),
      };
      
      await set(newUserRef, user);
      return user;
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
      const reservationsRef = ref(rtdb, 'nftReservations');
      const newReservationRef = push(reservationsRef);
      
      const nftReservation: NFTReservation = {
        id: newReservationRef.key!,
        userId: reservation.userId,
        nftType: reservation.nftType,
        price: reservation.price,
        txHash: reservation.txHash,
        verified: false,
        createdAt: new Date(),
      };
      
      await set(newReservationRef, nftReservation);
      return nftReservation;
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