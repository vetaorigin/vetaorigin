import { ProfileModel } from "../models/ProfileModel.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * GET PROFILE: Fetches public profile data
 * Usage: GET /user/profile/:userId
 */
export const getProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const profile = await ProfileModel.findById(userId);

        if (!profile) return res.status(404).json({ msg: "Profile not found" });

        return res.json({ success: true, profile });
    } catch (err) {
        logger.error("GET_PROFILE_FAILED", { error: err.message });
        res.status(500).json({ msg: "Failed to retrieve profile" });
    }
};

/**
 * UPDATE PROFILE: Updates user metadata
 * Usage: PUT /user/profile/me
 */
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; // From authMiddleware
        const { displayName, bio, avatarUrl, customData } = req.body;

        const updatedProfile = await ProfileModel.update(userId, {
            display_name: displayName,
            bio,
            avatar_url: avatarUrl,
            metadata: customData // This allows third-party extensions
        });

        return res.json({ success: true, profile: updatedProfile });
    } catch (err) {
        logger.error("UPDATE_PROFILE_FAILED", { error: err.message });
        res.status(500).json({ msg: "Failed to update profile" });
    }
};