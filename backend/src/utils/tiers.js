// utils/tiers.js

export const TIERS = {
  free: {
    name: "free",
    ttsLimit: 10,   // 10 requests per day
    sttLimit: 10,
    s2sLimit: 10,
    chatLimit: 10,
  },

  basic: {
    name: "basic",
    ttsLimit: 300,  // 300 requests per day
    sttLimit: 300,
    s2sLimit: 300,
    chatLimit: 300,
  },

  pro: {
    name: "pro",
    ttsLimit: 3000, // 3000 requests per day
    sttLimit: 3000,
    s2sLimit: 3000,
    chatLimit: 3000,
  },

  enterprise: {
    name: "enterprise",
    ttsLimit: Infinity,
    sttLimit: Infinity,
    s2sLimit: Infinity,
    chatLimit: Infinity,
  },
};
