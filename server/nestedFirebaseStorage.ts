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
        console.log('Raw user data from Firebase:', userData);

        return {
          id: uid,
          uid: uid,
          email: userData.auth?.email || '',
          referralCode: userData.referral?.code || '',
          inviteCode: userData.referral?.invitedBy || null,
          aocPoints: userData.aocPoints?.total || 0,
          inviteCount: userData.referral?.inviteCount || 0,
          multiplier: userData.multiplier || 1,
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
        multiplier: 1,
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

  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const users: User[] = [];

        Object.entries(usersData).forEach(([uid, userData]: [string, any]) => {
          users.push({
            id: uid,
            uid: uid,
            email: userData.auth?.email || '',
            referralCode: userData.referral?.code || '',
            inviteCode: userData.referral?.invitedBy || null,
            aocPoints: userData.aocPoints?.total || 0,
            inviteCount: userData.referral?.inviteCount || 0,
            createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date()
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

  async getUserTasks(userUid: string): Promise<UserTask[]> {
    try {
      const userRef = ref(rtdb, `users/${userUid}/tasks`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const tasks = snapshot.val();
        const userTasks: UserTask[] = [];

        // Convert boolean task status to UserTask objects
        Object.entries(tasks).forEach(([taskField, completed]) => {
          if (typeof completed === 'boolean') {
            const taskId = this.getTaskIdFromField(taskField);
            userTasks.push({
              id: `${userUid}_${taskId}`,
              userId: userUid,
              taskId: taskId,
              completed: completed as boolean,
              completedAt: completed ? new Date() : undefined,
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

  async getUserTask(userUid: string, taskId: string): Promise<UserTask | undefined> {
    try {
      const userTasks = await this.getUserTasks(userUid);
      return userTasks.find(ut => ut.taskId === taskId);
    } catch (error) {
      console.error('Error getting user task:', error);
      return undefined;
    }
  }

  async completeTask(userUid: string, taskId: string): Promise<UserTask> {
    try {
      const taskField = this.getTaskFieldName(taskId);

      // Update task status in Firebase
      await update(ref(rtdb, `users/${userUid}/tasks`), {
        [taskField]: true
      });

      // Get task points and user multiplier
      const tasks = await this.getAllTasks();
      const task = tasks.find(t => t.id === taskId);
      const basePoints = task?.points || 1000;
      
      // Get user's current multiplier
      const userRef = ref(rtdb, `users/${userUid}/multiplier`);
      const multiplierSnapshot = await get(userRef);
      const multiplier = multiplierSnapshot.exists() ? multiplierSnapshot.val() : 1;
      
      const totalPoints = basePoints * multiplier;

      // Award calculated points to user
      await this.updateUserPoints(userUid, totalPoints);

      return {
        id: `${userUid}_${taskId}`,
        userId: userUid,
        taskId: taskId,
        completed: true,
        completedAt: new Date(),
      };
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  async claimTaskReward(userUid: string, taskId: string): Promise<UserTask> {
    try {
      // First check if task is already completed
      const userTask = await this.getUserTask(userUid, taskId);
      if (userTask && userTask.completed) {
        // Task already completed, just return it
        return userTask;
      }

      // Complete the task and award points
      return await this.completeTask(userUid, taskId);
    } catch (error) {
      console.error('Error claiming task reward:', error);
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
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users = snapshot.val();
        const existingCode = Object.values(users).find((user: any) => 
          user.referral?.code === result
        );
        if (!existingCode) {
          break;
        }
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
        const users = snapshot.val();

        // Find user with this referral code
        const userEntry = Object.entries(users).find(([uid, userData]: [string, any]) => 
          userData.referral?.code === referralCode
        );

        if (userEntry) {
          const [uid, userData] = userEntry;
          const currentInviteCount = userData.referral?.inviteCount || 0;
          const currentPoints = userData.aocPoints?.total || 0;
          const newInviteCount = currentInviteCount + 1;

          // Auto-reward Normie wishlist at specific invite milestones
          const autoRewardMilestones = [25, 40, 50, 80, 99];
          const shouldRewardNormie = autoRewardMilestones.includes(newInviteCount);

          const updateData: any = {
            'referral/inviteCount': newInviteCount,
            'aocPoints/total': currentPoints + 100 // +100 AOC points per invite
          };

          // If user reaches milestone and doesn't already have a wishlist, give free Normie
          if (shouldRewardNormie && !userData.wishlist?.type) {
            updateData['wishlist/type'] = 'normie';
            updateData['wishlist/amount'] = 1;
            updateData['wishlist/txHash'] = `AUTO_REWARD_${newInviteCount}_INVITES`;
            updateData['wishlist/confirmed'] = true;
            updateData['wishlist/timestamp'] = serverTimestamp();
            
            console.log(`Auto-rewarded 1 Normie NFT to user ${uid} for reaching ${newInviteCount} invites`);
          }

          await update(ref(rtdb, `users/${uid}`), updateData);
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
        const tasksData = snapshot.val();
        const tasks: Task[] = [];
        
        Object.entries(tasksData).forEach(([id, taskData]: [string, any]) => {
          tasks.push({
            id: id,
            name: taskData.name,
            description: taskData.description,
            platform: taskData.platform,
            url: taskData.url,
            points: taskData.points,
            isActive: taskData.isActive !== false,
          });
        });
        
        return tasks.filter(task => task.isActive);
      }
      
      // Initialize default tasks if none exist
      await this.initializeDefaultTasks();
      return await this.getAllTasks();
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  private async initializeDefaultTasks(): Promise<void> {
    try {
      const tasksRef = ref(rtdb, 'tasks');
      const defaultTasks = {
        "1": {
          name: "Follow on X",
          description: "Follow our official X account",
          platform: "twitter",
          url: "https://x.com/DogByteLabz",
          points: 1000,
          isActive: true,
        },
        "2": {
          name: "Follow on Instagram",
          description: "Follow our Instagram for updates",
          platform: "instagram",
          url: "https://instagram.com/aoc.offical",
          points: 1000,
          isActive: true,
        },
        "3": {
          name: "Join Telegram",
          description: "Join our official Telegram channel",
          platform: "telegram",
          url: "https://t.me/AOCoffical",
          points: 1000,
          isActive: true,
        },
      };
      
      await set(tasksRef, defaultTasks);
    } catch (error) {
      console.error('Error initializing default tasks:', error);
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
      // Check if transaction hash is already used globally
      const txSnapshot = await get(ref(rtdb, `transactions/${reservation.txHash}`));
      if (txSnapshot.exists()) {
        throw new Error('Transaction hash has already been used');
      }

      const reservationId = `${Date.now()}_${reservation.userId}`;
      
      // Create transaction entry for global tracking
      const transactionData = {
        uid: reservation.userId,
        type: reservation.nftType,
        amount: reservation.price,
        confirmed: true,
        timestamp: serverTimestamp()
      };

      // Get current user wishlist data
      const userWishlistRef = ref(rtdb, `users/${reservation.userId}/wishlist/${reservation.nftType}`);
      const currentWishlistSnapshot = await get(userWishlistRef);
      const currentReservations = currentWishlistSnapshot.exists() ? currentWishlistSnapshot.val() : [];
      
      // Ensure it's an array
      const reservationsArray = Array.isArray(currentReservations) ? currentReservations : [];
      
      // Create new reservation entry
      const newReservation = {
        txHash: reservation.txHash,
        amount: reservation.price,
        confirmed: true,
        timestamp: serverTimestamp()
      };

      // Add to reservations array
      reservationsArray.push(newReservation);

      // Execute all operations atomically
      const updates = {
        [`transactions/${reservation.txHash}`]: transactionData,
        [`users/${reservation.userId}/wishlist/${reservation.nftType}`]: reservationsArray,
        [`nft_reservations/${reservationId}`]: {
          userId: reservation.userId,
          nftType: reservation.nftType,
          price: reservation.price,
          txHash: reservation.txHash,
          walletAddress: reservation.walletAddress,
          solAmount: reservation.solAmount,
          verified: true,
          verificationAttempts: 1,
          createdAt: serverTimestamp()
        }
      };

      await update(ref(rtdb), updates);

      return {
        id: reservationId,
        userId: reservation.userId,
        nftType: reservation.nftType,
        price: reservation.price,
        txHash: reservation.txHash,
        walletAddress: reservation.walletAddress,
        solAmount: reservation.solAmount,
        verified: true,
        verificationAttempts: 1,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating NFT reservation:', error);
      throw error;
    }
  }

  async getNFTReservations(userId: string): Promise<NFTReservation[]> {
    try {
      const userReservations: NFTReservation[] = [];
      
      // Check new nft_reservations structure first
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
      
      // Also check legacy wishlist structure for backward compatibility
      const wishlistRef = ref(rtdb, `users/${userId}/wishlist`);
      const wishlistSnapshot = await get(wishlistRef);
      
      if (wishlistSnapshot.exists()) {
        const wishlist = wishlistSnapshot.val();
        if (wishlist.type && wishlist.txHash) {
          // Check if this wishlist reservation is not already in the new structure
          const existingReservation = userReservations.find(r => r.txHash === wishlist.txHash);
          if (!existingReservation) {
            userReservations.push({
              id: `${userId}_wishlist`,
              userId: userId,
              nftType: wishlist.type,
              price: 1, // Always show 1 NFT for wishlist reservations
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
            walletAddress: data.walletAddress,
            solAmount: data.solAmount,
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
      const txSnapshot = await get(ref(rtdb, `transactions/${txHash}`));
      return txSnapshot.exists();
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
              walletAddress: data.walletAddress,
              solAmount: data.solAmount,
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
}

export const nestedFirebaseStorage = new NestedFirebaseStorage();