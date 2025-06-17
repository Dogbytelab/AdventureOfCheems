import { 
  type User, 
  type Task, 
  type UserTask, 
  type NFTReservation,
  type InsertNFTReservation 
} from "@shared/schema";
import { nestedFirebaseStorage } from "./nestedFirebaseStorage";

type CreateUserData = {
  uid: string;
  email: string;
  referralCode: string;
  inviteCode?: string | null;
};

export interface IStorage {
  getUserByUid(uid: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: CreateUserData): Promise<User>;
  generateReferralCode(): Promise<string>;
  incrementInviteCount(referralCode: string): Promise<void>;

  getAllTasks(): Promise<Task[]>;
  getUserTasks(userUid: string): Promise<UserTask[]>;
  getUserTask(userUid: string, taskId: string): Promise<UserTask | undefined>;
  completeTask(userUid: string, taskId: string): Promise<UserTask>;
  claimTaskReward(userUid: string, taskId: string): Promise<UserTask>;

  createNFTReservation(reservation: InsertNFTReservation): Promise<NFTReservation>;
  getNFTReservations(userUid: string): Promise<NFTReservation[]>;
  getAllNFTReservations(): Promise<NFTReservation[]>;
  isTransactionHashUsed(txHash: string): Promise<boolean>;
  getNFTReservationCountByType(nftType: string): Promise<number>;
  getUserNFTReservationsByType(userUid: string, nftType: string): Promise<NFTReservation[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tasks: Map<string, Task>;
  private userTasks: Map<string, UserTask>;
  private nftReservations: Map<string, NFTReservation>;

  private currentUserId: number;
  private currentTaskId: number;
  private currentUserTaskId: number;
  private currentNFTReservationId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.userTasks = new Map();
    this.nftReservations = new Map();

    this.currentUserId = 1;
    this.currentTaskId = 1;
    this.currentUserTaskId = 1;
    this.currentNFTReservationId = 1;

    this.initializeDefaultTasks();
  }

  private initializeDefaultTasks() {
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

    defaultTasks.forEach(taskData => {
      const taskId = this.currentTaskId++; 
      const task: Task = {
        id: taskId.toString(),
        name: taskData.name,
        description: taskData.description,
        platform: taskData.platform,
        url: taskData.url,
        points: taskData.points || 1000,
        isActive: taskData.isActive !== false,
      };
      this.tasks.set(task.id, task);
    });
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uid === uid);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id: id.toString(),
      uid: userData.uid,
      email: userData.email,
      referralCode: userData.referralCode,
      inviteCode: userData.inviteCode ?? null,
      aocPoints: 0,
      inviteCount: 0,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
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

      // Check if code already exists
      const existingUser = Array.from(this.users.values()).find(user => user.referralCode === result);
      if (!existingUser) {
        break;
      }
    } while (true);

    return result;
  }

  async incrementInviteCount(referralCode: string): Promise<void> {
    const user = Array.from(this.users.values()).find(u => u.referralCode === referralCode);
    if (user) {
      user.inviteCount += 1;
      user.aocPoints += 100; // +100 AOC points per invite
      this.users.set(user.id, user);
    }
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.isActive);
  }

  async getUserTasks(userUid: string): Promise<UserTask[]> {
    const user = await this.getUserByUid(userUid);
    if (!user) return [];
    return Array.from(this.userTasks.values()).filter(ut => ut.userId === user.id);
  }

  async getUserTask(userUid: string, taskId: string): Promise<UserTask | undefined> {
    const user = await this.getUserByUid(userUid);
    if (!user) return undefined;
    return Array.from(this.userTasks.values()).find(
      ut => ut.userId === user.id && ut.taskId === taskId
    );
  }

  async completeTask(userUid: string, taskId: string): Promise<UserTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const user = await this.getUserByUid(userUid);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if task is already completed
    const existingUserTask = await this.getUserTask(userUid, taskId);
    if (existingUserTask && existingUserTask.completed) {
      return existingUserTask;
    }

    // Create user task
    const userTask: UserTask = {
      id: (this.currentUserTaskId++).toString(),
      userId: user.id,
      taskId,
      completed: true,
      completedAt: new Date(),
    };

    this.userTasks.set(userTask.id, userTask);

    // Award points to user
    user.aocPoints += task.points;
    this.users.set(user.id, user);

    return userTask;
  }

  async claimTaskReward(userUid: string, taskId: string): Promise<UserTask> {
    // For this implementation, claiming is the same as completing
    return this.completeTask(userUid, taskId);
  }

  async createNFTReservation(reservation: InsertNFTReservation): Promise<NFTReservation> {
    const id = this.currentNFTReservationId++;
    const nftReservation: NFTReservation = {
      id: id.toString(),
      ...reservation,
      verified: false,
      verificationAttempts: 0,
      createdAt: new Date(),
    };
    this.nftReservations.set(nftReservation.id, nftReservation);
    return nftReservation;
  }

  async getNFTReservations(userUid: string): Promise<NFTReservation[]> {
    const user = await this.getUserByUid(userUid);
    if (!user) return [];
    return Array.from(this.nftReservations.values()).filter(r => r.userId === user.id);
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
    const user = await this.getUserByUid(userUid);
    if (!user) return [];
    return Array.from(this.nftReservations.values()).filter(r => 
      r.userId === user.id && r.nftType.toLowerCase() === nftType.toLowerCase()
    );
  }
}

import { nestedFirebaseStorage } from "./nestedFirebaseStorage";

// Use NestedFirebaseStorage as the default storage implementation
export const storage: IStorage = nestedFirebaseStorage;