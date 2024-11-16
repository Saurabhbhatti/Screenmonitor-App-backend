import { Response } from 'express';

const successResponse = (res: Response, msg: String, data: any) => {
  let resData = { status: true, message: msg, data: data };
  return res.status(200).json(resData);
};

const successResponseWithPagination = (res: Response, msg: String, total: Number, data: Object, counts?: Object) => {
  let resData = { status: true, message: msg, total: total, data: data, counts };
  return res.status(200).json(resData);
};

const errorResponse = (res: Response, msg: String) => {
  let resData = { status: false, message: msg, data: null };
  return res.status(500).json(resData);
};

const notFoundResponse = (res: Response, msg: String) => {
  let resData = { status: false, message: msg, data: null };
  return res.status(404).json(resData);
};

const validationError = (res: Response, msg: String) => {
  let resData = { status: false, message: msg, data: null };
  return res.status(400).json(resData);
};

const unauthorizedResponse = (res: Response, msg: String) => {
  let resData = { status: false, message: msg, data: null };
  return res.status(401).json(resData);
};

export { successResponse, successResponseWithPagination, errorResponse, notFoundResponse, validationError, unauthorizedResponse };
