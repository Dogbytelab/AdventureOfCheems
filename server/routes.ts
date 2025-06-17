import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";

const router = Router();

// Users endpoints
router.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/users/:uid", async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUid(req.params.uid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  inviteCode: z.string().optional().nullable(),
});

router.post("/users", async (req: Request, res: Response) => {
  try {
    const validation = createUserSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Invalid input", errors: validation.error.errors });
    }

    const { email, inviteCode } = validation.data;

    // Generate referral code
    const referralCode = await storage.generateReferralCode();

    const user = await storage.createUser({
      uid: req.body.uid,
      email,
      referralCode,
      inviteCode,
    });

    // If user used an invite code, increment the referrer's invite count
    if (inviteCode) {
      await storage.incrementInviteCount(inviteCode);
    }

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Tasks endpoints
router.get("/tasks", async (req: Request, res: Response) => {
  try {
    const tasks = await storage.getAllTasks();
    res.json(tasks);
  } catch (error) {
    console.error("Error getting tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// User tasks endpoints - using UID instead of ID
router.get("/user-tasks/:userUid", async (req: Request, res: Response) => {
  try {
    const userTasks = await storage.getUserTasks(req.params.userUid);
    res.json(userTasks);
  } catch (error) {
    console.error("Error getting user tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/user-tasks/:userUid/:taskId/complete", async (req: Request, res: Response) => {
  try {
    const userTask = await storage.completeTask(req.params.userUid, req.params.taskId);
    res.json(userTask);
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/user-tasks/:userUid/:taskId/claim", async (req: Request, res: Response) => {
  try {
    const userTask = await storage.claimTaskReward(req.params.userUid, req.params.taskId);
    res.json(userTask);
  } catch (error) {
    console.error("Error claiming task reward:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// NFT Reservations endpoints - using UID instead of ID
router.get("/nft-reservations/:userUid", async (req: Request, res: Response) => {
  try {
    const reservations = await storage.getNFTReservations(req.params.userUid);
    res.json(reservations);
  } catch (error) {
    console.error("Error getting NFT reservations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const createReservationSchema = z.object({
  nftType: z.string(),
  price: z.number(),
  txHash: z.string(),
});

router.post("/nft-reservations/:userUid", async (req: Request, res: Response) => {
  try {
    const validation = createReservationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Invalid input", errors: validation.error.errors });
    }

    const { nftType, price, txHash } = validation.data;

    const reservation = await storage.createNFTReservation({
      userId: req.params.userUid,
      nftType,
      price,
      txHash,
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error("Error creating NFT reservation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export function registerRoutes(app: any) {
  app.use('/api', router);
  return app;
}

export { router };