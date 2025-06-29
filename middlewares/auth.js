import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token; 

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.clearCookie("token");
    return res.redirect('/login');
  }
};
export function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).send("Không có quyền truy cập");
  next();
}



