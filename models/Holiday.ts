import mongoose, { Schema } from 'mongoose';

import IHoliday from '../interfaces/holiday';

const HolidaySchema = new Schema<IHoliday>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  date: { type: Date, required: true },
  name: { type: String, required: true },
});

const Holiday = mongoose.model<IHoliday>('Holiday', HolidaySchema);

export default Holiday;
