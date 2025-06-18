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

router.get("/user-tasks/:userUid", async (req: Request, res: Response) => {
  try {
    const userTasks = await storage.getUserTasks(req.params.userUid);
    res.json(userTasks);
  } catch (error) {
    console.error("Error getting user tasks:", error);
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
  nftType: z.string().min(1),
  price: z.number().positive(),
  txHash: z.string().min(32),
  walletAddress: z.string().min(32),
  solAmount: z.string(),
});

router.post("/nft-reservations/:userUid", async (req: Request, res: Response) => {
  try {
    const validation = createReservationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Invalid input", 
        errors: validation.error.errors 
      });
    }

    const { nftType, price, txHash, walletAddress, solAmount } = validation.data;
    const userUid = req.params.userUid;

    // Check if transaction hash is already used
    const isHashUsed = await storage.isTransactionHashUsed(txHash);
    if (isHashUsed) {
      return res.status(409).json({ 
        message: "Transaction hash already used. Please use a unique transaction." 
      });
    }

    // Validate NFT limits (total supply)
    const nftLimits: { [key: string]: number } = {
      'NORMIE': 25000,
      'SIGMA': 5000,
      'CHAD': 669
    };

    const currentCount = await storage.getNFTReservationCountByType(nftType);
    const limit = nftLimits[nftType.toUpperCase()];
    
    if (!limit) {
      return res.status(400).json({ 
        message: "Invalid NFT type. Must be NORMIE, SIGMA, or CHAD." 
      });
    }

    if (currentCount >= limit) {
      return res.status(400).json({ 
        message: `${nftType.toUpperCase()} NFTs are sold out. Only ${limit} available.` 
      });
    }

    // Check per-user limits
    const userPerTypeLimits: { [key: string]: number } = {
      'NORMIE': 25,
      'SIGMA': 1,
      'CHAD': 1
    };

    const userNFTCount = await storage.getUserNFTReservationsByType(userUid, nftType);
    const userLimit = userPerTypeLimits[nftType.toUpperCase()];
    
    if (userNFTCount.length >= userLimit) {
      return res.status(400).json({ 
        message: `You have reached your limit of ${userLimit} ${nftType.toUpperCase()} NFT(s). You currently have ${userNFTCount.length} reserved.` 
      });
    }

    const reservation = await storage.createNFTReservation({
      userId: userUid,
      nftType,
      price,
      txHash,
      walletAddress,
      solAmount,
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error("Error creating NFT reservation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// NFT supply endpoint
router.get("/nft-supply", async (req: Request, res: Response) => {
  try {
    const nftTypes = ['normie', 'sigma', 'chad'];
    const nftLimits = { normie: 25000, sigma: 5000, chad: 669 };
    const supply: Record<string, { sold: number; remaining: number }> = {};

    for (const nftType of nftTypes) {
      const sold = await storage.getNFTReservationCountByType(nftType);
      const limit = nftLimits[nftType as keyof typeof nftLimits];
      supply[nftType] = {
        sold,
        remaining: Math.max(0, limit - sold)
      };
    }

    res.json(supply);
  } catch (error) {
    console.error("Error getting NFT supply:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add verification endpoint
router.post("/verify-transaction", async (req: Request, res: Response) => {
  try {
    const { txHash, expectedAmountUSD, nftType } = req.body;
    
    if (!txHash || !expectedAmountUSD || !nftType) {
      return res.status(400).json({ 
        valid: false,
        error: "Missing required parameters: txHash, expectedAmountUSD, nftType" 
      });
    }

    // Check if transaction hash is already used
    const isUsed = await storage.isTransactionHashUsed(txHash);
    if (isUsed) {
      return res.json({
        valid: false,
        error: "Transaction hash has already been used"
      });
    }

    // Use proper Solana verification
    const { verifySolanaTransaction } = await import("./solanaVerification");
    console.log(`Verifying transaction: ${txHash} for $${expectedAmountUSD} USD (${nftType})`);
    
    const verification = await verifySolanaTransaction(txHash, expectedAmountUSD, nftType);
    
    console.log("Verification result:", verification);
    res.json(verification);
  } catch (error) {
    console.error("Error verifying transaction:", error);
    res.status(500).json({ 
      valid: false,
      error: error instanceof Error ? error.message : "Transaction verification failed"
    });
  }
});

export function registerRoutes(app: any) {
  app.use('/api', router);
  return app;
}

export { router };