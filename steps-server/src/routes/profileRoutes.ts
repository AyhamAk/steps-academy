import { Router } from "express";

import { placeholder } from "../controllers/profileController";

const router = Router();

router.get("/", placeholder);

export default router;
