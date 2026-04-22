export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    // In production AWS setup, you might delegate this to AWS Cognito or IAM
    if (!authHeader) {
        return res.status(401).json({ error: "Missing Authorization Header" });
    }
    
    // Proceed if token exists (Gateway acts as a pass-through after validation)
    next();
};