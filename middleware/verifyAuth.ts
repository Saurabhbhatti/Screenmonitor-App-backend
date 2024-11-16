import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { unauthorizedResponse } from '../helpers/api-responses';

const secret_key = process.env.JWT_SECRET!;

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.headers.authorization!.split(' ')[1];
    jwt.verify(token, secret_key);
    next();
  } catch (error) {
    return unauthorizedResponse(res, 'You are not authorized');
  }
};

export default authenticate;
