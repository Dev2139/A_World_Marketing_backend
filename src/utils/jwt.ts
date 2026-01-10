import jwt from 'jsonwebtoken';
import { Request } from 'express';

// Types
export interface JwtPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'AGENT' | 'CUSTOMER';
}

// Environment variables
const ACCESS_TOKEN_SECRET: string = process.env.ACCESS_TOKEN_SECRET || 'default_access_secret';
const REFRESH_TOKEN_SECRET: string = process.env.REFRESH_TOKEN_SECRET || 'default_refresh_secret';

// Token expiration times
const ACCESS_TOKEN_EXPIRES_IN: string = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN: string = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Generate access token
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    algorithm: 'HS256'
  });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    algorithm: 'HS256'
  });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from request cookies
 */
export const extractTokenFromCookies = (req: Request, tokenType: 'access' | 'refresh'): string | null => {
  if (tokenType === 'access' && req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  
  if (tokenType === 'refresh' && req.cookies && req.cookies.refreshToken) {
    return req.cookies.refreshToken;
  }
  
  return null;
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};