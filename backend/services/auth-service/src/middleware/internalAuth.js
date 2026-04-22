// A simple gatekeeper for internal service-to-service communication
export const verifyInternalKey = (req, res, next) => {
    const key = req.headers['x-internal-secret'];
    
    if (!key || key !== process.env.INTERNAL_API_KEY) {
        return res.status(403).json({ msg: "Forbidden: Invalid internal key" });
    }
    
    next();
};