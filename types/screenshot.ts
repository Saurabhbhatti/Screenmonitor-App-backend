import mongoose from 'mongoose';

export type FilterOptions = {
  userId: mongoose.Types.ObjectId;
  createdAt?: {
    $gte: Date;
    $lt: Date;
  };
  projectId?: mongoose.Types.ObjectId;
};
