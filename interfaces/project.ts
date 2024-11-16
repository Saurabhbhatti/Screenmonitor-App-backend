import { ObjectId } from 'mongoose';
import constants from '../helpers/constants';

export default interface IProject {
  projectName: string;
  status: typeof constants.STATUS.ACTIVE | typeof constants.STATUS.INACTIVE;
  isScreenshot: boolean;
  notes?: string;
  companyId: ObjectId;
  createdAt?:Date; // Optional field
  updatedAt?:Date; // Optional field
}