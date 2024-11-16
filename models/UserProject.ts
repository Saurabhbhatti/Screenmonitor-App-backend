import mongoose, { Schema } from 'mongoose';
import { IUserProject } from '../interfaces/userProject';

const userProjectSchema: Schema<IUserProject> = new Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Company',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    projectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Project',
      },
    ],
  },
  { timestamps: true }
);

const UserProject = mongoose.model<IUserProject>('UserProject', userProjectSchema);

export default UserProject;
