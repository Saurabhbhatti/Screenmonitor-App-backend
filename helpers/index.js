import moment from "moment-timezone";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import cloudinary from "cloudinary";
import path from "path";
import ejs from "ejs";
import Timer from "../models/Timer.js";
dotenv.config();

const secret_key = process.env.JWT_SECRET;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getUserId = (req) => {
  let token = req.headers.authorization
    ? req.headers.authorization.split(" ")[1]
    : null;
  if (token) {
    let decoded = jwt.verify(token, secret_key);
    let userId = decoded._id;
    return userId;
  }
};

const sendEmail = async (to, subject, user) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const tempFilePath = path.join(__dirname, "../views/welcome.ejs");
  const template = await ejs.renderFile(tempFilePath, {
    name: user.name,
    email: user.email,
    password: user.password,
  });

  return transporter.sendMail({
    from: process.env.SMTP_MAIL,
    to: to,
    subject: subject,
    html: template,
  });
};

const getCurrentTime = () => {
  return moment.tz("Asia/Kolkata").format();
};

const calculateDailyTotalWorkingHour = async (userId, currentSessionTime) => {
  // Fetch all timers for the user on the given date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timers = await Timer.find({ userId , createdAt: { $gte: today } });

  // Calculate the total working hours for the day, including the current session time
  let totalWorkingTime = timers.reduce((total, timer) => {
    return total + parseTime(timer.totalTime);
  }, parseTime(currentSessionTime)); // Include current session time

  return formatTime(totalWorkingTime); // Convert the total time back to a formatted string
};

// Helper function to parse a time string (HH:mm:ss) to seconds
const parseTime = (time) => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

// Helper function to format seconds to time string (HH:mm:ss)
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(remainingSeconds).padStart(2, "0")}`;
};

const uploadToCloudinary = async (image) => {
  const result = await cloudinary.v2.uploader.upload(image.tempFilePath, {
    resource_type: "auto",
    folder: "screenshots",
  });
  return result;
};

const generatePassword = () => {
  let password = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 8; i++) {
    password += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return password;
};

function formatTimeToHiA(time) {
  const hour = time.getHours();
  const minute = time.getMinutes();
  const period = hour >= 12 ? "PM" : "AM";

  const hourIn12HourFormat = hour % 12 || 12;

  return `${hourIn12HourFormat}:${minute
    .toString()
    .padStart(2, "0")} ${period}`;
}

const dateFormatter = (time) => {
  return moment(time).format("MMM DD, YYYY");
};

function calculateTimeDifference(checkinTimeStr, checkoutTimeStr) {
  const checkinTime = new Date(checkinTimeStr); // Convert check-in time to Date object
  const checkoutTime = new Date(checkoutTimeStr); // Convert check-out time to Date object

  // Calculate the difference in milliseconds
  const timeDifference = checkoutTime - checkinTime;

  // Create a new Date object representing the time difference
  const dateDifference = new Date(0, 0, 0, 0, 0, 0, timeDifference);

  // Extract hours, minutes, and seconds from the dateDifference
  const hours = dateDifference.getHours();
  const minutes = dateDifference.getMinutes();
  const seconds = dateDifference.getSeconds();

  // Format the time difference
  const formattedTimeDifference = `${hours}:${minutes}:${seconds}`;

  return formattedTimeDifference;
}

const formatDuration = (totalMinutes) => {
  const duration = moment.duration(totalMinutes, "minutes");
  const hours = duration.hours().toString().padStart(2, "0");
  const mins = duration.minutes().toString().padStart(2, "0");
  const seconds = duration.seconds().toString().padStart(2, "0");
  return `${hours}:${mins}:${seconds}`;
};

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validatePhoneNumber(phoneNumber) {
  const regex = /^[0-9]{10}$/;
  return regex.test(phoneNumber);
}

export {
  getUserId,
  sendEmail,
  getCurrentTime,
  calculateDailyTotalWorkingHour,
  parseTime,
  formatTime,
  uploadToCloudinary,
  generatePassword,
  formatTimeToHiA,
  dateFormatter,
  calculateTimeDifference,
  formatDuration,
  validateEmail,
  validatePhoneNumber,
};
