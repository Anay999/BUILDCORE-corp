const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header("token");

    if (!token) {
      return res.status(401).json({
        message: "Access denied ❌",
      });
    }

    const verified = jwt.verify(token, "secretkey");

    req.user = verified;

    next();

  } catch (error) {
    res.status(401).json({
      message: "Invalid token ❌",
    });
  }
};

module.exports = authMiddleware;