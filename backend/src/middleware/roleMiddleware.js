
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    console.log("ROLE CHECK:", {
      userId: req.user.userId,
      userRole: req.user.role,
      allowedRoles,
    });

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action",
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };
