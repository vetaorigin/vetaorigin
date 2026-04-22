import { PreferenceModel } from "../models/PreferenceModel.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * GET ALL PREFERENCES: Fetches all settings for a user
 * Usage: GET /user/preferences
 */
export const getPreferences = async (req, res) => {
    try {
        const preferences = await PreferenceModel.findByUserId(req.user.id);
        res.json({ success: true, preferences });
    } catch (err) {
        logger.error("GET_PREFS_FAILED", { userId: req.user.id, error: err.message });
        res.status(500).json({ msg: "Failed to retrieve preferences" });
    }
};

/**
 * UPDATE PREFERENCE: Updates a specific setting key-value pair
 * Usage: PUT /user/preferences/:key
 */
export const updatePreference = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({ msg: "Missing key or value" });
        }

        const updatedPref = await PreferenceModel.upsert(req.user.id, key, value);
        res.json({ success: true, preference: updatedPref });
    } catch (err) {
        logger.error("UPDATE_PREF_FAILED", { userId: req.user.id, error: err.message });
        res.status(500).json({ msg: "Failed to update preference" });
    }
};