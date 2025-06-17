import type { Express } from "express";
import { createServer, type Server } from "http";
import { firebaseStorage } from "./firebaseStorage";
import { insertUserSchema, insertUserTaskSchema, insertNFTReservationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get user by Firebase UID
  app.get("/api/users/:uid", async (req, res) => {
    try {
      const user = await firebaseStorage.getUserByUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new user
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await firebaseStorage.getUserByUid(validatedData.uid);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Generate unique referral code
      const referralCode = await firebaseStorage.generateReferralCode();
      
      // Clean up invite code - convert empty string to null
      const inviteCode = validatedData.inviteCode && validatedData.inviteCode.trim() 
        ? validatedData.inviteCode.trim() 
        : null;
      
      const user = await firebaseStorage.createUser({
        ...validatedData,
        referralCode,
        inviteCode,
      });
      
      // If user used an invite code, update the referrer's invite count
      if (inviteCode) {
        await firebaseStorage.incrementInviteCount(inviteCode);
      }
      
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await firebaseStorage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user tasks
  app.get("/api/user-tasks/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const userTasks = await firebaseStorage.getUserTasks(userId);
      res.json(userTasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Complete a task
  app.post("/api/user-tasks", async (req, res) => {
    try {
      const validatedData = insertUserTaskSchema.parse(req.body);
      
      // Check if task is already completed
      const existingUserTask = await firebaseStorage.getUserTask(validatedData.userId, validatedData.taskId);
      if (existingUserTask && existingUserTask.completed) {
        return res.status(409).json({ message: "Task already completed" });
      }
      
      const userTask = await firebaseStorage.completeTask(validatedData.userId, validatedData.taskId);
      res.status(201).json(userTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create NFT reservation
  app.post("/api/nft-reservations", async (req, res) => {
    try {
      const validatedData = insertNFTReservationSchema.parse(req.body);
      const reservation = await firebaseStorage.createNFTReservation(validatedData);
      res.status(201).json(reservation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get NFT reservations for user
  app.get("/api/nft-reservations/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const reservations = await firebaseStorage.getNFTReservations(userId);
      res.json(reservations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
