import express from "express";
import repoController from "../controllers/repo.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const repoRoutes = express.Router();

repoRoutes
  .route("/")
  .get(repoController.listRepository)
  .post(protect, repoController.createRepository);

repoRoutes
  .route("/:owner/:repo")
  .get(repoController.getUserRepository)
  .patch(protect, repoController.updateRepository)
  .delete(protect, repoController.deleteRepository);

repoRoutes
  .route("/:owner/:repo/collaborators")
  .get(repoController.getRepositoryCollaborators);

repoRoutes
  .route("/:owner/:repo/collaborators/:username")
  .patch(protect, repoController.updateCollaboratorPermission)
  .post(protect, repoController.addCollaborator)
  .delete(protect, authorize("owner", "admin"), repoController.deleteCollaborator);

export default repoRoutes;
