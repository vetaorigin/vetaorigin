export const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    
    // Log the error for DevOps to track in CloudWatch
    console.error(`[GatewayError] ${status} - ${message}`);

    res.status(status).json({
        success: false,
        error: message,
        path: req.path
    });
};