import { createOrg ,getOrg,searchOrgs,listOrgs,updateOrg,deleteOrg} from "../controllers/org.controller.js";
import {protect} from  "../middleware/authMiddleware.js"
import { Router } from "express";

const orgRouter=Router();
orgRouter.post("/",protect, createOrg);                     // Create organization
orgRouter.get("/",protect, listOrgs);                       // List all organizations
orgRouter.get("/search",protect, searchOrgs);               // Search organizations by name
orgRouter.get("/:orgName",protect, getOrg);                 // Get specific organization
orgRouter.patch("/:orgName",protect, updateOrg);            // Update org (admin/owner)
orgRouter.delete("/:orgName",protect, deleteOrg);    

export default orgRouter;                                     // Delete org (admin/owner)