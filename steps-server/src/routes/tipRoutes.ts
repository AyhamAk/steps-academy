import { Router } from "express";

import {
  createTip,
  deleteTip,
  listAllTips,
  listTips,
  markTipRead,
  updateTip,
} from "../controllers/tipController";
import { adminOnly, requireAuth } from "../middleware/auth";

const router = Router();

// Parents see published tips; the admin list is a separate route so the
// parent one can never accidentally leak a draft.
router.get("/", requireAuth, listTips);
router.get("/all", requireAuth, adminOnly, listAllTips);

router.post("/", requireAuth, adminOnly, createTip);
router.patch("/:tipId", requireAuth, adminOnly, updateTip);
router.delete("/:tipId", requireAuth, adminOnly, deleteTip);

router.post("/:tipId/read", requireAuth, markTipRead);

export default router;
