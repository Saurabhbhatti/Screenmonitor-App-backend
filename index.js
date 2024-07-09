import express, { json } from 'express';
const app = express();
import { config } from 'dotenv';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import cron from 'node-cron';

// MIDDLEWEARES
import Db from './config/Db.js';
import apiRouter from './routes/api.js';
import { userAutoCheckout } from './helpers/timerUtils.js';

let PORT = 8000;
Db();

app.set('view engine', 'ejs');

app.use(cors());
app.use(json());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
  })
);

// ROUTES

app.get('/', (req, res) => {
  res.send('The server is running.....');
});

app.use('/api/', apiRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// schedule a cron job to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  await userAutoCheckout();
});
