import express from "express";
import starController from "../controllers/star.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";


const starRoutes = express.Router({ mergeParams: true });

starRoutes
    .route("/:owner/:repo/star")
    .delete(authMiddleware.protect, starController.removeStar)
    .post(authMiddleware.protect, starController.createStar);
starRoutes
    .route("/:owner/:repo/stargazers")
    .get(starController.listStargazers);
starRoutes
    .route("/user/starred")
    .get(authMiddleware.protect, starController.listUserStarredRepos);
starRoutes.route("/user/:username/starred").get(starController.listUserStarredReposByUsername);
starRoutes.route("/user/starred/:owner/:repo").get(authMiddleware.protect, starController.checkIfUserStarredRepo);



export default starRoutes;
