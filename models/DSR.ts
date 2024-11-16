import mongoose, { Schema } from 'mongoose';
import IDSR from '../interfaces/dsr';

const dsrSchema = new Schema<IDSR>(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

const DSR = mongoose.model<IDSR>('DSR', dsrSchema);

export default DSR;
