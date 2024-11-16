import { ObjectId } from 'mongoose';

export default interface IScreenshot {
  companyId: ObjectId;
  userId: ObjectId;
  projectId: ObjectId;
  screenshot: {
    fileName?: string;
    fileType?: string;
    fileUrl?: string;
  };
  activities: [
    {
      time: string;
      mouseClicks: number;
      mouseScrolls: number;
      keyStrokes: number;
      applications: [{ name: string; description: string }];
    },
  ];
  totalMouseClicks: number;
  totalMouseScrolls: number;
  totalKeyStrokes: number;
  totalMinutes: number;
  createdAt?: Date;
  updatedAt?: Date;
}
