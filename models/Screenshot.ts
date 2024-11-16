import mongoose, { Schema } from 'mongoose';

import IScreenshot from '../interfaces/screenshot';

const screenshotSchema: Schema<IScreenshot> = new Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    screenshot: {
      fileName: { type: String, required: false },
      fileType: { type: String, required: false },
      fileUrl: { type: String, required: false },
    },
    activities: [
      {
        time: { type: String, required: true },
        mouseClicks: { type: Number, required: true },
        mouseScrolls: { type: Number, required: true },
        keyStrokes: { type: Number, required: true },
        applications: [
          {
            name: { type: String, required: false },
            description: { type: String, required: false },
          },
        ],
      },
    ],
    totalMouseClicks: { type: Number, required: true, default: 0 },
    totalMouseScrolls: { type: Number, required: true, default: 0 },
    totalKeyStrokes: { type: Number, required: true, default: 0 },
    totalMinutes: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
);

const Screenshot = mongoose.model<IScreenshot>('Screenshot', screenshotSchema);

export default Screenshot;
