import prisma from "@packages/libs/prisma";
import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

const isAuthenticated = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies.mico_access_token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized! No token provided." });
    }

    // verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_TOKEN_SECRET as string
    ) as { id: string; role: "user" | "seller" };

    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ message: "Unauthorized! Invalid token." });
    }

    // Check if user exists
    const user = await prisma.users.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ message: "Account not found!" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Unauthorized! Token expired or invalid." });
  }
};

export default isAuthenticated;
