import mongoose, { Schema } from 'mongoose';
import ISetting from '../interfaces/setting';

const SettingSchema: Schema<ISetting> = new Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    leave: {
      leaveType: { type: String },
      leaveValue: { type: String },
      leaveColor: {
        sickLeave: { type: String },
        vacationLeave: { type: String },
        personalLeave: { type: String },
        onLeave: { type: String },
        absent: { type: String },
        present: { type: String },
      },
    },
    attendance: {
      totalWorkingHours: { type: String },
      flexibleTotalHours: { type: String },
      elegibleCompoff: { type: String },
      halfLeave: { type: String },
    },
    productivity: {
      unproductiveColor: { type: String },
      neutralColor: { type: String },
      productiveColor: { type: String },
    },
    jira: {
      jiraBaseUrl: { type: String },
      jiraEmail: { type: String },
      jiraApiToken: { type: String },
    },
    slack: {
      webhookUrl: { type: String },
    },
  },
  { timestamps: true },
);

const Setting = mongoose.model<ISetting>('Setting', SettingSchema);

export default Setting;
