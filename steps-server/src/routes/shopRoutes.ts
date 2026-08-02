import { Router } from "express";

import { placeholder } from "../controllers/shopController";

const router = Router();

router.get("/", placeholder);

export default router;
