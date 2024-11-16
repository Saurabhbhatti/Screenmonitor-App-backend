import { Request } from 'express';
import moment from 'moment-timezone';
import dotenv from 'dotenv';
import jwt, { JwtPayload } from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import cloudinary from 'cloudinary';
import path from 'path';
import ejs from 'ejs';
import fs from 'fs';
import { User } from '../types';
import { htmlToText } from 'html-to-text';
import constants from './constants';
dotenv.config();

const secret_key = process.env.JWT_SECRET!;

// Configuring cloudinary with API credentials
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to extract user ID from JWT token in request headers
const getUserId = (req: Request) => {
  let token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
  if (token) {
    let decoded: JwtPayload = jwt.verify(token, secret_key) as JwtPayload;
    let userId = decoded._id;
    return userId;
  }
};

const generateToken = (user: any) => {
  let jwtPayload = user.toJSON();
  const secret = process.env.JWT_SECRET;
  let token = jwt.sign(jwtPayload, secret!);
  return token;
};

// Function to send an email using nodemailer and ejs templates
const sendEmail = async (to: string, subject: string, user: User) => {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const tempFilePath = path.resolve(__dirname, '../views/welcome.ejs');

  if (!fs.existsSync(tempFilePath)) {
    throw new Error('Template file not found');
  }

  const template = await ejs.renderFile(tempFilePath, {
    name: `${user.firstName} ${user.lastName}`,
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
const sendEmailforLeave = async (to: string, from: string, subject: string, text: string) => {
  try {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
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
  } catch (error: any) {
    throw new Error('Failed to send email: ' + error.message);
  }
};

// Function to send a forgot password email using nodemailer and ejs templates
const sendForgotPasswordEmail = async (to: string, subject: string, user: User) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.verify();

    // Generating path to forgot password email template file
    // const __filename = fileURLToPath(import.meta.url);
    // const __dirname = path.dirname(__filename);
    const tempFilePath = path.resolve(__dirname, '../views/forgot.ejs');

    const template = await ejs.renderFile(tempFilePath, {
      name: `${user.firstName} ${user.lastName}`,
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
    throw new Error('Error sending email');
  }
};

// Function to convert a given date to Indian Standard Time (IST)
const convertToIST = (date: Date, format = 'YYYY-MM-DDTHH:mm.SSSZ') => {
  return moment(date).tz('Asia/Kolkata').format(format);
};

// Function to get current time in seconds
const getCurrentTime = () => Math.floor(Date.now() / 1000);

export const getStartAndEndOfDay = () => {
  const startOfDay = moment().startOf('day').toDate();
  const endOfDay = moment().endOf('day').toDate();
  return { startOfDay, endOfDay };
};

// Function to upload an image file to cloudinary
const uploadToCloudinary = async (imagePath: string, folder: string) => {
  const folderPath = `${folder}/${process.env.CLOUDINARY_FOLDER}`;
  const result = await cloudinary.v2.uploader.upload(imagePath, {
    resource_type: 'auto',
    folder: folderPath,
    transformation: [{ width: 800, height: 600, crop: 'limit' }, { quality: 'auto' }],
  });
  return result.secure_url;
};


// Function to generate a random password
const generatePassword = () => {
  let password = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 8; i++) {
    password += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return password;
};

// Function to validate an email address using regex
function validateEmail(email: string) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Function to validate a phone number (10 digits)
function validatePhoneNumber(phoneNumber: string) {
  const regex = /^[0-9]{10}$/;
  return regex.test(phoneNumber);
}

// Calculate the time 10 minutes ago
const getTenMinutesAgoTime = () => new Date(Date.now() - 10 * 60 * 1000);

// convert date to unix time in seconds
const convertDateToUnix = (date: Date) => Math.floor(date.getTime() / 1000);

const getDefaultStartTime = () => moment().utc().startOf('day').unix();

const getDefaultEndTime = () => moment().utc().endOf('day').unix();

const formatTaskDescription = (description: string): string => {
  return (
    description
      .replace(/<p><strong>([^:]+):<\/strong><\/p>/g, '<b>$1</b>')
      .replace(/<ul>/g, '<ul class="task-list">') // Apply task-list class for bullet points
      .replace(/<\/ul>/g, '</ul>')
      .replace(/<\/li>\s*<li>/g, '</li><li>') // Handle list item breaks
      .replace(/<\/li><\/ul>/g, '</li></ul>')
      .replace(/<li>/g, '<li>') // Ensure list item formatting
      .replace(/<\/li>/g, '</li>')
      // Apply styling to the text
      .replace(/<b>/g, '<b style="color: #333; font-size: 16px;">')
      .replace(/<\/b>/g, '</b>')
  );
};

const stripHtmlTags = (html: string): string => {
  return htmlToText(html, {
    wordwrap: 130,
  });
};

const getStartAndEndUnixTimes = (startDate: string, endDate: string) => {
  const startUnixTime = moment.tz(startDate, 'YYYY-MM-DD', 'UTC').startOf('day').unix();
  const endUnixTime = moment.tz(endDate, 'YYYY-MM-DD', 'UTC').endOf('day').unix();
  return { startUnixTime, endUnixTime };
};

const generateFileName = (
  startDate: string,
  userCode: string,
  format: typeof constants.FILE_FORMATS.EXCEL | typeof constants.FILE_FORMATS.PDF | undefined,
) => {
  const monthName = new Date(startDate).toLocaleDateString('en-US', { month: 'long' });
  const fileExtension = format === constants.FILE_FORMATS.EXCEL ? constants.FILE_FORMATS.EXCEL : constants.FILE_FORMATS.PDF;
  return `${userCode}-${monthName}.${fileExtension}`;
};

const formatDateForExcel = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// TODO: use moment to convert unix time to IST
const getUnixTimeInIST = (unixTime: number) => unixTime + 19800; // Adding 5 hours 30 minutes to convert to IST

const startOfDayUnix = (date: Date) => moment(date).tz('Asia/Kolkata').startOf('day').unix();
const endOfDayUnix = (date: Date) => moment(date).tz('Asia/Kolkata').endOf('day').unix();

const validatePanNumber = (panNumber: string) => {
  const regex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
  return regex.test(panNumber);
};

const validateAadharNumber = (aadharNumber: string) => {
  const regex = /^[0-9]{12}$/;
  return regex.test(aadharNumber);
};

const validateBankAccountNumber = (bankAccountNumber: string) => {
  const regex = /^[0-9]{9,18}$/;
  return regex.test(bankAccountNumber);
};

const validateIFSCCode = (ifscCode: string) => {
  const regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return regex.test(ifscCode);
};

const convertHtmlToSlackFormat = (html: string) => {
  // Replace <p><strong></strong></p> with *text:* (for the heading)
  let slackFormattedText = html.replace(/<p><strong>(.*?)<\/strong><\/p>/g, '*$1:*');

  // Replace all <li> elements inside <ul> with bullet points and remove <ul> tags
  slackFormattedText = slackFormattedText.replace(/<ul>\s*|<\/ul>/g, ''); // Remove <ul> tags
  slackFormattedText = slackFormattedText.replace(/<li>(.*?)<\/li>/g, '• $1\n'); // Convert <li> to bullet points with newline after each item

  // Ensure there's a newline after the heading to separate it from the list
  slackFormattedText = slackFormattedText.replace(/:\n?/, ':\n\n');

  return slackFormattedText.trim(); // Trim to remove any trailing newlines
};

export default {
  getUserId,
  generateToken,
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
  getDefaultStartTime,
  getDefaultEndTime,
  formatTaskDescription,
  stripHtmlTags,
  getStartAndEndUnixTimes,
  generateFileName,
  formatDateForExcel,
  getDayName,
  getUnixTimeInIST,
  startOfDayUnix,
  endOfDayUnix,
  validatePanNumber,
  validateAadharNumber,
  validateBankAccountNumber,
  validateIFSCCode,
  convertHtmlToSlackFormat,
};
