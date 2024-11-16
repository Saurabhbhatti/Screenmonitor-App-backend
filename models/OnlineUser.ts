import mongoose, { Schema } from 'mongoose';

import IOnlineUser from '../interfaces/onlineUser';

const OnlineUserSchema: Schema<IOnlineUser> = new Schema<IOnlineUser>(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    checkinId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Timer' },
  },
  { timestamps: true },
);

const OnlineUser = mongoose.model<IOnlineUser>('OnlineUser', OnlineUserSchema);

export default OnlineUser;
