export const TIERS = {
  free: {
    name: "free",
    chat: 10,
    tts: 10,
    stt: 10,
    s2s: 10,
  },
  basic: {
    name: "basic",
    chat: 300,
    tts: 300,
    stt: 300,
    s2s: 300,
  },
  pro: {
    name: "pro",
    chat: 3000,
    tts: 3000,
    stt: 3000,
    s2s: 3000,
  },
  enterprise: {
    name: "enterprise",
    chat: Infinity,
    tts: Infinity,
    stt: Infinity,
    s2s: Infinity,
  },
};

/**
 * Helper to get limits by plan name
 */
export const getLimit = (planName, actionType) => {
  const plan = TIERS[planName?.toLowerCase()] || TIERS.free;
  return plan[actionType] || 0;
};