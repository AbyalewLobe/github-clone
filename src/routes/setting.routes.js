import { getSettings,updateSettings,resetSettings } from "../controllers/setting.controller.js";
import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";

const settingRouter = Router();

settingRouter.get("/", protect, getSettings);
settingRouter.patch("/", protect, updateSettings);
settingRouter.delete("/", protect, resetSettings);

export default settingRouter;
