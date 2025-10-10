import express from "express";
import forkController from "../controllers/fork.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const forkRoutes = express.Router({ mergeParams: true });

forkRoutes
  .route("/user/forks")
  .get(authMiddleware.protect, forkController.listUserForks);
forkRoutes
  .route("/:owner/:repo/fork")
  .post(authMiddleware.protect, forkController.forkRepo)
  .delete(authMiddleware.protect, forkController.unforkRepo);
forkRoutes
  .route("/:owner/:repo/forks")
  .get(forkController.listForks);
forkRoutes
  .route("/:owner/:repo/forks/:username")
  .get(authMiddleware.protect, forkController.checkUserFork);


export default forkRoutes;