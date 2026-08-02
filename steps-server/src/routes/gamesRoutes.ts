import { Router } from "express";

import { placeholder } from "../controllers/gamesController";

const router = Router();

router.get("/", placeholder);

export default router;
