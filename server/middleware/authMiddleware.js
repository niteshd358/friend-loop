import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  // Support both: x-auth-token and Authorization: Bearer
  const bearerToken = req.header("Authorization");
  const token =
    req.header("x-auth-token") ||
    (bearerToken && bearerToken.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied ❌" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ msg: "Token is not valid" });
  }
}
