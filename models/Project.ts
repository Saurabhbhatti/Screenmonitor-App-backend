import mongoose, { Schema } from 'mongoose';
import IProject from '../interfaces/project';
import constants from '../helpers/constants';

const projectSchema: Schema<IProject> = new Schema(
  {
    projectName: { type: String, required: true },
    status: {
      type: String,
      enum: [constants.STATUS.ACTIVE, constants.STATUS.INACTIVE],
      default: constants.STATUS.ACTIVE,
      required: false,
    },
    isScreenshot: { type: Boolean},
    notes: { type: String},
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' } 
  },
  { timestamps: true },
);  

const Project = mongoose.model<IProject>('Project', projectSchema);

export default Project;
