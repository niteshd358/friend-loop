import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  // Support both: x-auth-token and Authorization: Bearer
  const bearerToken = req.header("Authorization");
  const token =
    req.header("x-auth-token") ||
    (bearerToken && bearerToken.startsWith("Bearer ") ? bearerToken.split(" ")[1] : null);

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied ❌" });
  }

  try {
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "supersecretkey";
    const decoded = jwt.verify(token, accessSecret) as any;

    // Token design: Ensure token is specifically an access token
    if (decoded.typ && decoded.typ !== "access") {
      return res.status(401).json({ msg: "Invalid token type, access token required ❌" });
    }

    req.user = { id: decoded.id, ...decoded };
    next();
  } catch (err: any) {
    // Return 401 Unauthorized for expired or invalid tokens (NOT 400)
    return res.status(401).json({ msg: "Token is not valid or has expired" });
  }
}
