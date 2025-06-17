import { 
  users, 
  tasks, 
  userTasks, 
  nftReservations,
  type User, 
  type InsertUser, 
  type Task, 
  type InsertTask,
  type UserTask,
  type InsertUserTask,
  type NFTReservation,
  type InsertNFTReservation
} from "@shared/schema";

export interface IStorage {
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  generateReferralCode(): Promise<string>;
  incrementInviteCount(referralCode: string): Promise<void>;
  
  getAllTasks(): Promise<Task[]>;
  getUserTasks(userId: number): Promise<UserTask[]>;
  getUserTask(userId: number, taskId: number): Promise<UserTask | undefined>;
  completeTask(userId: number, taskId: number): Promise<UserTask>;
  
  createNFTReservation(reservation: InsertNFTReservation): Promise<NFTReservation>;
  getNFTReservations(userId: number): Promise<NFTReservation[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private userTasks: Map<number, UserTask>;
  private nftReservations: Map<number, NFTReservation>;
  
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
    
    // Initialize with default tasks
    this.initializeDefaultTasks();
  }

  private initializeDefaultTasks() {
    const defaultTasks: InsertTask[] = [
      {
        name: "Follow on X",
        description: "Follow @Dogbytelab on X (Twitter)",
        platform: "twitter",
        url: "https://twitter.com/Dogbytelab",
        points: 1000,
        isActive: true,
      },
      {
        name: "Follow on Instagram",
        description: "Follow @aoc.offical on Instagram",
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
      const task: Task = {
        id: this.currentTaskId++,
        ...taskData,
      };
      this.tasks.set(task.id, task);
    });
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uid === uid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      ...insertUser,
      aocPoints: 0,
      inviteCount: 0,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async generateReferralCode(): Promise<string> {
    // Generate a unique 6-character alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    do {
      result = '';
      for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } while (Array.from(this.users.values()).some(user => user.referralCode === result));
    
    return result;
  }

  async incrementInviteCount(referralCode: string): Promise<void> {
    const referrer = Array.from(this.users.values()).find(user => user.referralCode === referralCode);
    if (referrer) {
      referrer.inviteCount++;
      this.users.set(referrer.id, referrer);
    }
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.isActive);
  }

  async getUserTasks(userId: number): Promise<UserTask[]> {
    return Array.from(this.userTasks.values()).filter(ut => ut.userId === userId);
  }

  async getUserTask(userId: number, taskId: number): Promise<UserTask | undefined> {
    return Array.from(this.userTasks.values()).find(
      ut => ut.userId === userId && ut.taskId === taskId
    );
  }

  async completeTask(userId: number, taskId: number): Promise<UserTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if task is already completed
    const existingUserTask = await this.getUserTask(userId, taskId);
    if (existingUserTask && existingUserTask.completed) {
      return existingUserTask;
    }

    // Create or update user task
    const userTask: UserTask = {
      id: this.currentUserTaskId++,
      userId,
      taskId,
      completed: true,
      completedAt: new Date(),
    };

    this.userTasks.set(userTask.id, userTask);

    // Award points to user
    user.aocPoints += task.points;
    this.users.set(userId, user);

    return userTask;
  }

  async createNFTReservation(reservation: InsertNFTReservation): Promise<NFTReservation> {
    const id = this.currentNFTReservationId++;
    const nftReservation: NFTReservation = {
      id,
      ...reservation,
      verified: false, // Will be verified manually or by admin
      createdAt: new Date(),
    };
    this.nftReservations.set(id, nftReservation);
    return nftReservation;
  }

  async getNFTReservations(userId: number): Promise<NFTReservation[]> {
    return Array.from(this.nftReservations.values()).filter(r => r.userId === userId);
  }
}

export const storage = new MemStorage();
