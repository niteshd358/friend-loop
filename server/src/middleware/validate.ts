import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import mongoose from "mongoose";

// Validate request body, query, or params with a Zod schema
export const validate = (schema: z.ZodSchema<any>, source: "body" | "query" | "params" = "body") => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === "body") {
        req.body = parsed;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          msg: "Validation error",
          errors: err.issues.map((e) => ({ path: e.path.join("."), message: e.message })),
        });
      }
      return res.status(400).json({ msg: "Malformed request payload" });
    }
  };
};

// Check if a string is a valid MongoDB ObjectId
export const isValidObjectId = (id: any): boolean => {
  return typeof id === "string" && mongoose.isValidObjectId(id);
};

// Middleware to sanitize request bodies/queries in-place against NoSQL injection ($ and . keys)
export const sanitizeNoSql = (req: Request, _res: Response, next: NextFunction) => {
  const sanitizeInPlace = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else if (typeof obj[key] === "object") {
        sanitizeInPlace(obj[key]);
      }
    }
  };

  if (req.body && typeof req.body === "object") sanitizeInPlace(req.body);
  if (req.query && typeof req.query === "object") sanitizeInPlace(req.query);
  if (req.params && typeof req.params === "object") sanitizeInPlace(req.params);

  next();
};
