import jwt from "jsonwebtoken";
// import { unauthorizedResponse } from "../helpers/api-response.js";
import dotenv from "dotenv";
import { unauthorizedResponse } from "../helpers/api-responses.js";
dotenv.config();

const secret_key = process.env.JWT_SECRET;

const authenticate = (req, res, next) => {
  try {
    let token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, secret_key);
    next();
  } catch (error) {
    return unauthorizedResponse(res, "You are not authorized", null);
  }
};

export default authenticate;
