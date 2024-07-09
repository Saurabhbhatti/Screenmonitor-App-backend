import moment from "moment-timezone";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import cloudinary from "cloudinary";
import path from "path";
import ejs from "ejs";
import fs from "fs";
import { fileURLToPath } from "url";
dotenv.config();

const secret_key = process.env.JWT_SECRET; 

// Configuring cloudinary with API credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to extract user ID from JWT token in request headers
const getUserId = (req) => {
  let token = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
  if (token) {
    let decoded = jwt.verify(token, secret_key);
    let userId = decoded._id;
    return userId;
  }
};

// Function to send an email using nodemailer and ejs templates
const sendEmail = async (to, subject, user) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const tempFilePath = path.join(__dirname, "../views/welcome.ejs");

  if (!fs.existsSync(tempFilePath)) {
    throw new Error("Template file not found");
  }

  const template = await ejs.renderFile(tempFilePath, {
    name: user.name,
    email: user.email,
    password: user.password,
  });

  // Sending email
  return transporter.sendMail({
    from: process.env.SMTP_MAIL,
    to: to,
    subject: subject,
    html: template,
  });
};

// Function to send a basic text email for leave
const sendEmailforLeave = async (to, from, subject, text) => {
  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    return transporter.sendMail({
      from: from,
      to: to,
      subject: subject,
      text: text,
    });
  } catch (error) {
    throw new Error('Failed to send email: ' + error.message);
  }
};

// Function to send a forgot password email using nodemailer and ejs templates
const sendForgotPasswordEmail = async (to, subject, user) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.verify();

    // Generating path to forgot password email template file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const tempFilePath = path.join(__dirname, "../views/forgot.ejs");

    const template = await ejs.renderFile(tempFilePath, {
      name: user.name,
      email: user.email,
      password: user.password,
    });

    await transporter.sendMail({
      from: process.env.SMTP_MAIL,
      to: to,
      subject: subject,
      html: template,
    });
  } catch (error) {
    throw new Error("Error sending email");
  }
};

// Function to convert a given date to Indian Standard Time (IST)
const convertToIST = (date, format = 'YYYY-MM-DDTHH:mm.SSSZ') => {
  return moment(date).tz('Asia/Kolkata').format(format);
};

// Function to get current time in seconds
const getCurrentTime = () => Math.floor(Date.now() / 1000);

// Function to upload an image file to cloudinary
const uploadToCloudinary = async (image) => {
  const folderPath = process.env.CLOUDINARY_FOLDER || 'screenshots/default';
  const result = await cloudinary.v2.uploader.upload(image.tempFilePath, {
    resource_type: "auto",
    folder: folderPath,
  });
  return result;
};

// Function to generate a random password
const generatePassword = () => {
  let password = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 8; i++) {
    password += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return password;
};

// Function to validate an email address using regex
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Function to validate a phone number (10 digits)
function validatePhoneNumber(phoneNumber) {
  const regex = /^[0-9]{10}$/;
  return regex.test(phoneNumber);
}

// Calculate the time 10 minutes ago
const getTenMinutesAgoTime = () => new Date(Date.now() - 10 * 60 * 1000);

// convert date to unix time in seconds
const convertDateToUnix = (date) => Math.floor(date.getTime() / 1000);

export {
  getUserId,
  sendEmail,
  sendEmailforLeave,
  sendForgotPasswordEmail,
  getCurrentTime,
  convertToIST,
  uploadToCloudinary,
  generatePassword,
  validateEmail,
  validatePhoneNumber,
  getTenMinutesAgoTime,
  convertDateToUnix,
};
