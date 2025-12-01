// utils/tiers.js

export const TIERS = {
  free: {
    name: "free",
    ttsLimit: 20 * 60, // 20 minutes
    sttLimit: 20 * 60,
    s2sLimit: 20 * 60,
  },
  basic: {
    name: "basic",
    ttsLimit: 60 * 60, // 60 minutes
    sttLimit: 60 * 60,
    s2sLimit: 60 * 60,
  },
  pro: {
    name: "pro",
    ttsLimit: 300 * 60, // 300 minutes
    sttLimit: 300 * 60,
    s2sLimit: 300 * 60,
  },
  enterprise: {
    name: "enterprise",
    ttsLimit: Infinity,
    sttLimit: Infinity,
    s2sLimit: Infinity,
  },
};
