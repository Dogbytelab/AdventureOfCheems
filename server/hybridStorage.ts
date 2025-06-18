import { nestedFirebaseStorage } from "./nestedFirebaseStorage";
import { 
  type User, 
  type Task, 
  type UserTask, 
  type NFTReservation,
  type InsertNFTReservation 
} from "@shared/schema";

// Inline memory storage to avoid circular dependency
class SimpleMemStorage {
  private users: Map<string, User> = new Map();
  private tasks: Map<string, Task> = new Map();
  private userTasks: Map<string, UserTask> = new Map();
  private nftReservations: Map<string, NFTReservation> = new Map();
  private currentUserId = 1;
  private currentTaskId = 1;
  private currentUserTaskId = 1;
  private currentNFTReservationId = 1;

  constructor() {
    this.initializeDefaultTasks();
  }

  private initializeDefaultTasks() {
    const defaultTasks = [
      { id: "1", name: "Follow on X", description: "Follow our official X account", platform: "twitter", url: "https://x.com/DogByteLabz", points: 1000, isActive: true },
      { id: "2", name: "Follow on Instagram", description: "Follow our Instagram for updates", platform: "instagram", url: "https://instagram.com/aoc.offical", points: 1000, isActive: true },
      { id: "3", name: "Join Telegram", description: "Join our official Telegram channel", platform: "telegram", url: "https://t.me/AOCoffical", points: 1000, isActive: true },
    ];

    defaultTasks.forEach(task => {
      this.tasks.set(task.id, task as Task);
    });
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.uid === uid);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(userData: any): Promise<User> {
    const user: User = {
      id: (this.currentUserId++).toString(),
      uid: userData.uid,
      email: userData.email,
      referralCode: userData.referralCode,
      inviteCode: userData.inviteCode || null,
      aocPoints: 0,
      inviteCount: 0,
      multiplier: 1,
      createdAt: new Date(),
    };
    this.users.set(user.uid, user);
    return user;
  }

  async generateReferralCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    do {
      result = '';
      for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } while (Array.from(this.users.values()).some(u => u.referralCode === result));
    return result;
  }

  async incrementInviteCount(referralCode: string): Promise<void> {
    const user = Array.from(this.users.values()).find(u => u.referralCode === referralCode);
    if (user) {
      user.inviteCount++;
    }
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getUserTasks(userUid: string): Promise<UserTask[]> {
    const user = await this.getUserByUid(userUid);
    if (!user) return [];
    return Array.from(this.userTasks.values()).filter(ut => ut.userId === user.id);
  }

  async getUserTask(userUid: string, taskId: string): Promise<UserTask | undefined> {
    const user = await this.getUserByUid(userUid);
    if (!user) return undefined;
    return Array.from(this.userTasks.values()).find(ut => ut.userId === user.id && ut.taskId === taskId);
  }

  async completeTask(userUid: string, taskId: string): Promise<UserTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("Task not found");
    
    const user = await this.getUserByUid(userUid);
    if (!user) throw new Error("User not found");

    const existingUserTask = await this.getUserTask(userUid, taskId);
    if (existingUserTask && existingUserTask.completed) {
      return existingUserTask;
    }

    const userTask: UserTask = {
      id: (this.currentUserTaskId++).toString(),
      userId: user.id,
      taskId,
      completed: true,
      completedAt: new Date(),
    };
    
    this.userTasks.set(userTask.id, userTask);
    return userTask;
  }

  async claimTaskReward(userUid: string, taskId: string): Promise<UserTask> {
    return this.completeTask(userUid, taskId);
  }

  async createNFTReservation(reservation: InsertNFTReservation): Promise<NFTReservation> {
    const nftReservation: NFTReservation = {
      id: (this.currentNFTReservationId++).toString(),
      ...reservation,
      verified: false,
      verificationAttempts: 0,
      createdAt: new Date(),
    };
    this.nftReservations.set(nftReservation.id, nftReservation);
    return nftReservation;
  }

  async getNFTReservations(userUid: string): Promise<NFTReservation[]> {
    return Array.from(this.nftReservations.values()).filter(r => r.userId === userUid);
  }

  async getAllNFTReservations(): Promise<NFTReservation[]> {
    return Array.from(this.nftReservations.values());
  }

  async isTransactionHashUsed(txHash: string): Promise<boolean> {
    return Array.from(this.nftReservations.values()).some(r => r.txHash === txHash);
  }

  async getNFTReservationCountByType(nftType: string): Promise<number> {
    return Array.from(this.nftReservations.values()).filter(r => 
      r.nftType.toLowerCase() === nftType.toLowerCase()
    ).length;
  }

  async getUserNFTReservationsByType(userUid: string, nftType: string): Promise<NFTReservation[]> {
    return Array.from(this.nftReservations.values()).filter(r => 
      r.userId === userUid && r.nftType.toLowerCase() === nftType.toLowerCase()
    );
  }
}

export class HybridStorage {
  private memStorage: SimpleMemStorage;

  constructor() {
    this.memStorage = new SimpleMemStorage();
  }

  // Use Firebase for user data (read-only)
  async getUserByUid(uid: string): Promise<User | undefined> {
    try {
      return await nestedFirebaseStorage.getUserByUid(uid);
    } catch (error) {
      console.log("Firebase read failed, using memory storage");
      return await this.memStorage.getUserByUid(uid);
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await nestedFirebaseStorage.getAllUsers();
    } catch (error) {
      return await this.memStorage.getAllUsers();
    }
  }

  async createUser(userData: any): Promise<User> {
    // Try Firebase first, fallback to memory
    try {
      return await nestedFirebaseStorage.createUser(userData);
    } catch (error) {
      return await this.memStorage.createUser(userData);
    }
  }

  async generateReferralCode(): Promise<string> {
    try {
      return await nestedFirebaseStorage.generateReferralCode();
    } catch (error) {
      return await this.memStorage.generateReferralCode();
    }
  }

  async incrementInviteCount(referralCode: string): Promise<void> {
    try {
      await nestedFirebaseStorage.incrementInviteCount(referralCode);
    } catch (error) {
      await this.memStorage.incrementInviteCount(referralCode);
    }
  }

  // Use Firebase for tasks (read-only)
  async getAllTasks(): Promise<Task[]> {
    try {
      return await nestedFirebaseStorage.getAllTasks();
    } catch (error) {
      return await this.memStorage.getAllTasks();
    }
  }

  async getUserTasks(userUid: string): Promise<UserTask[]> {
    try {
      return await nestedFirebaseStorage.getUserTasks(userUid);
    } catch (error) {
      return await this.memStorage.getUserTasks(userUid);
    }
  }

  async getUserTask(userUid: string, taskId: string): Promise<UserTask | undefined> {
    try {
      return await nestedFirebaseStorage.getUserTask(userUid, taskId);
    } catch (error) {
      return await this.memStorage.getUserTask(userUid, taskId);
    }
  }

  async completeTask(userUid: string, taskId: string): Promise<UserTask> {
    try {
      return await nestedFirebaseStorage.completeTask(userUid, taskId);
    } catch (error) {
      return await this.memStorage.completeTask(userUid, taskId);
    }
  }

  async claimTaskReward(userUid: string, taskId: string): Promise<UserTask> {
    try {
      return await nestedFirebaseStorage.claimTaskReward(userUid, taskId);
    } catch (error) {
      return await this.memStorage.claimTaskReward(userUid, taskId);
    }
  }

  // Use memory storage for NFT reservations to avoid Firebase write permission issues
  async createNFTReservation(reservation: InsertNFTReservation): Promise<NFTReservation> {
    return await this.memStorage.createNFTReservation(reservation);
  }

  async getNFTReservations(userUid: string): Promise<NFTReservation[]> {
    return await this.memStorage.getNFTReservations(userUid);
  }

  async getAllNFTReservations(): Promise<NFTReservation[]> {
    return await this.memStorage.getAllNFTReservations();
  }

  async isTransactionHashUsed(txHash: string): Promise<boolean> {
    return await this.memStorage.isTransactionHashUsed(txHash);
  }

  async getNFTReservationCountByType(nftType: string): Promise<number> {
    return await this.memStorage.getNFTReservationCountByType(nftType);
  }

  async getUserNFTReservationsByType(userUid: string, nftType: string): Promise<NFTReservation[]> {
    return await this.memStorage.getUserNFTReservationsByType(userUid, nftType);
  }
}

export const hybridStorage = new HybridStorage();