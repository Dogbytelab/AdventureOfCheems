import { 
  ref, 
  set, 
  get, 
  update,
  serverTimestamp
} from "firebase/database";
import { rtdb } from "./firebase";
import { 
  type User, 
  type Task, 
  type UserTask, 
  type NFTReservation 
} from "@shared/schema";
import { IFirebaseStorage } from "./firebaseStorage";

export class NestedFirebaseStorage implements IFirebaseStorage {
  
  async getUserByUid(uid: string): Promise<User | undefined> {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
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
        createdAt: serverTimestamp()
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
    
    // Generate random code without checking duplicates for now
    // This avoids the indexing issue during user creation
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  async incrementInviteCount(referralCode: string): Promise<void> {
    try {
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const [uid, userData] of Object.entries(users)) {
          if ((userData as any).referral?.code === referralCode) {
            const currentCount = (userData as any).referral?.inviteCount || 0;
            const currentPoints = (userData as any).aocPoints?.total || 0;
            
            await update(ref(rtdb, `users/${uid}`), {
              'referral/inviteCount': currentCount + 1,
              'aocPoints/total': currentPoints + 100
            });
            break;
          }
        }
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
        id: "1",
        name: "Follow on X",
        description: "Follow our official X account",
        platform: "twitter",
        url: "https://x.com/DogByteLabz",
        points: 1000,
        isActive: true,
      },
      {
        id: "2", 
        name: "Follow on Instagram",
        description: "Follow our Instagram for updates",
        platform: "instagram",
        url: "https://instagram.com/aoc.offical",
        points: 1000,
        isActive: true,
      },
      {
        id: "3",
        name: "Join Telegram",
        description: "Join our official Telegram channel", 
        platform: "telegram",
        url: "https://t.me/AOCoffical",
        points: 1000,
        isActive: true,
      },
    ];

    const tasksRef = ref(rtdb, 'tasks');
    const tasksData: { [key: string]: Task } = {};
    
    defaultTasks.forEach(task => {
      tasksData[task.id] = task;
    });
    
    await set(tasksRef, tasksData);
  }

  async getUserTasks(userId: string): Promise<UserTask[]> {
    try {
      const userRef = ref(rtdb, `users/${userId}/tasks`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const tasks = snapshot.val();
        const userTasks: UserTask[] = [];
        
        Object.entries(tasks).forEach(([taskField, completed]) => {
          if (completed) {
            const taskId = this.getTaskIdFromField(taskField);
            userTasks.push({
              id: `${userId}_${taskId}`,
              userId,
              taskId,
              completed: true,
              completedAt: new Date(),
              points: 1000
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

  async getUserTask(userId: string, taskId: string): Promise<UserTask | undefined> {
    try {
      const taskField = this.getTaskFieldName(taskId);
      const userRef = ref(rtdb, `users/${userId}/tasks/${taskField}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists() && snapshot.val() === true) {
        return {
          id: `${userId}_${taskId}`,
          userId,
          taskId,
          completed: true,
          completedAt: new Date(),
          points: 1000
        };
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user task:', error);
      return undefined;
    }
  }

  async completeTask(userUid: string, taskId: string): Promise<UserTask> {
    try {
      const taskField = this.getTaskFieldName(taskId);
      const currentPointsRef = ref(rtdb, `users/${userUid}/aocPoints/total`);
      const currentPointsSnapshot = await get(currentPointsRef);
      const currentPoints = currentPointsSnapshot.exists() ? currentPointsSnapshot.val() : 0;
      
      const points = 1000;
      
      await update(ref(rtdb, `users/${userUid}`), {
        [`tasks/${taskField}`]: true,
        'aocPoints/total': currentPoints + points
      });
      
      return {
        id: `${userUid}_${taskId}`,
        userId: userUid,
        taskId: taskId,
        completed: true,
        completedAt: new Date(),
        points: points
      };
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
      await update(ref(rtdb, `users/${reservation.userId}/wishlist`), {
        type: reservation.nftType,
        amount: reservation.price,
        txHash: reservation.txHash,
        confirmed: false,
        timestamp: serverTimestamp()
      });
      
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
      const wishlistRef = ref(rtdb, `users/${userId}/wishlist`);
      const snapshot = await get(wishlistRef);
      
      if (snapshot.exists()) {
        const wishlist = snapshot.val();
        if (wishlist.type && wishlist.txHash) {
          return [{
            id: `${userId}_wishlist`,
            userId: userId,
            nftType: wishlist.type,
            price: wishlist.amount || 0,
            txHash: wishlist.txHash,
            verified: wishlist.confirmed || false,
            createdAt: wishlist.timestamp ? new Date(wishlist.timestamp) : new Date(),
          }];
        }
      }
      return [];
    } catch (error) {
      console.error('Error getting NFT reservations:', error);
      return [];
    }
  }

  async updateUserPoints(userId: string, points: number): Promise<void> {
    try {
      const currentPointsRef = ref(rtdb, `users/${userId}/aocPoints/total`);
      const snapshot = await get(currentPointsRef);
      const currentPoints = snapshot.exists() ? snapshot.val() : 0;
      
      await update(ref(rtdb, `users/${userId}/aocPoints`), {
        total: currentPoints + points
      });
    } catch (error) {
      console.error('Error updating user points:', error);
    }
  }

  private getTaskFieldName(taskId: string): string {
    const taskMap: { [key: string]: string } = {
      '1': 'followX',
      '2': 'followInsta', 
      '3': 'joinTelegram'
    };
    return taskMap[taskId] || `task_${taskId}`;
  }

  private getTaskIdFromField(fieldName: string): string {
    const fieldMap: { [key: string]: string } = {
      'followX': '1',
      'followInsta': '2',
      'joinTelegram': '3'
    };
    return fieldMap[fieldName] || fieldName.replace('task_', '');
  }
}

export const nestedFirebaseStorage = new NestedFirebaseStorage();