import { ObjectId } from 'mongoose';

export default interface ISetting {
  companyId: ObjectId;
  userId: ObjectId;
  leave?: {
    leaveType: string;
    leaveValue: string;
    leaveColor: {
      sickLeave: string;
      vacationLeave: string;
      personalLeave: string;
      onLeave: string;
      absent: string;
      present: string;
    };
  };
  attendance?: {
    totalWorkingHours: string;
    flexibleTotalHours: string;
    elegibleCompoff: string;
    halfLeave: string;
  };
  productivity?: {
    unproductiveColor: string;
    neutralColor: string;
    productiveColor: string;
  };
  jira?: {
    jiraBaseUrl: string;
    jiraEmail: string;
    jiraApiToken: string;
  };
  slack?: {
    webhookUrl: string;
  };
}
