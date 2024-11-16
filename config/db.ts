import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import logging from './logging';

const MONGODB_URL: string = process.env.DATABASE_URL!;

// Connect to MongoDB database
const connectToDB = () => {
  mongoose
    .connect(MONGODB_URL)
    .then(() => {
      logging.info('Database', 'Connected to the database at:', MONGODB_URL);
    })
    .catch((err) => {
      logging.error('Error connecting to database:', err.message);
      process.exit(1);
    });
};

export default connectToDB;
