import Organization from "../models/Organization.js";
import { successResponse, errorResponse } from "../utils/response.js";

/**
 * @desc Create a new organization
 * @route POST /api/orgs
 * @access Authenticated
 */
export const createOrg = async (req, res) => {
  try {
    const { name, description, avatarUrl } = req.body;

    // Check for duplicate org name
    const existingOrg = await Organization.findOne({ name: name.toLowerCase() });
    if (existingOrg) return errorResponse(res, "Organization name already exists", 409);

    const org = await Organization.create({
      name: name.toLowerCase(),
      description,
      avatarUrl,
      billingInfo: {},
    });

    return successResponse(res, org, "Organization created successfully", 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

/**
 * @desc List all organizations (with optional pagination/search)
 * @route GET /api/orgs
 * @access Authenticated
 */
export const listOrgs = async (req, res) => {
  try {
    const { page = 1, limit = 10, q } = req.query;
    const filter = q ? { name: { $regex: q, $options: "i" } } : {};

    const orgs = await Organization.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Organization.countDocuments(filter);

    return successResponse(res, { total, orgs }, "Organizations fetched successfully");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

/**
 * @desc Get organization details
 * @route GET /api/orgs/:orgName
 * @access Authenticated
 */
export const getOrg = async (req, res) => {
  try {
    const { orgName } = req.params;
    const org = await Organization.findOne({ name: orgName.toLowerCase() });

    if (!org) return errorResponse(res, "Organization not found", 404);

    return successResponse(res, org, "Organization details fetched");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

/**
 * @desc Update organization (Owner/Admin only)
 * @route PATCH /api/orgs/:orgName
 * @access Owner/Admin
 */
export const updateOrg = async (req, res) => {
  try {
    const { orgName } = req.params;
    const { description, avatarUrl, billingInfo } = req.body;

    // Build dynamic update data
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (billingInfo !== undefined) updateData.billingInfo = billingInfo;

    if (Object.keys(updateData).length === 0)
      return errorResponse(res, "No fields provided for update", 400);

    // Find and update in one step, return the updated document
    const updatedOrg = await Organization.findOneAndUpdate(
      { name: orgName.toLowerCase() },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedOrg) return errorResponse(res, "Organization not found", 404);

    return successResponse(res, updatedOrg, "Organization updated successfully");
  } catch (err) {
    console.error("updateOrg error:", err);
    return errorResponse(res, err.message);
  }
};

/**
 * @desc Delete organization (Owner/Admin only)
 * @route DELETE /api/orgs/:orgName
 * @access Owner/Admin
 */
export const deleteOrg = async (req, res) => {
  try {
    const { orgName } = req.params;
    const org = await Organization.findOneAndDelete({ name: orgName.toLowerCase() });

    if (!org) return errorResponse(res, "Organization not found", 404);

    return successResponse(res, null, "Organization deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

/**
 * @desc Search organizations by name
 * @route GET /api/orgs/search?q=query
 * @access Authenticated
 */
export const searchOrgs = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return errorResponse(res, "Search query is required", 400);

    const orgs = await Organization.find({ name: { $regex: q, $options: "i" } }).limit(20);
    return successResponse(res, orgs, "Organizations search results");
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
