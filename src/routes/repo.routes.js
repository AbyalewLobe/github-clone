import express from "express";
import repoController from "../controllers/repo.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const repoRoutes = express.Router();

repoRoutes
  .route("/")
  .get(repoController.listRepository)
  .post(authMiddleware.protect, repoController.createRepository);

repoRoutes
  .route("/:owner/:repo")
  .get(repoController.getUserRepository)
  .patch(authMiddleware.protect, repoController.updateRepository)
  .delete(authMiddleware.protect, repoController.deleteRepository);

repoRoutes
  .route("/:owner/:repo/collaborators")
  .get(repoController.getRepositoryCollaborators);

repoRoutes
  .route("/:owner/:repo/collaborators/:username")
  .patch(authMiddleware.protect, repoController.updateCollaboratorPermission)
  .post(authMiddleware.protect, repoController.addCollaborator)
  .delete(
    authMiddleware.protect,
    authMiddleware.authorize("owner", "admin"),
    repoController.deleteCollaborator
  );

export default repoRoutes;
