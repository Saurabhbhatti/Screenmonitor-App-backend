import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import cron from 'node-cron';

// MIDDLEWEARES
import connectToDB from './config/db';
import logging from './config/logging';
import apiRouter from './routes/api';
import { userAutoCheckout } from './helpers/timerUtils';
import cronjobs from './helpers/cronjobs';

const app = express();

const NAMESPACE: string = 'Server';

// Connect to Database
connectToDB();

app.set('view engine', 'ejs');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware with limit 5MB
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 5000000 }, // 5MB
    abortOnLimit: true,
    responseOnLimit: 'File size is too large, Please upload a file less than 5MB',
  }),
);

app.use((req: Request, res: Response, next: NextFunction) => {
  // Log the req
  logging.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);

  res.on('finish', () => {
    // Log the res
    logging.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`);
  });
  next();
});

app.use('/api/', apiRouter);

app.get('/', (_req: Request, res: Response) => {
  res.send('The server is running.....');
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

// schedule a cron job to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  await userAutoCheckout();
});

// schedule a cron job to run every day at 9:30 am
cron.schedule('30 9 * * *', async () => {
  await cronjobs.creditDailyCompoff();
});

// schedule a cron job to run on 1st day of every month at 9:30 am
cron.schedule('30 9 1 * *', async () => {
  await cronjobs.creditMonthlyCompoff();
});
