const constants = {
  STATUS: { ACTIVE: 'active', INACTIVE: 'inactive' },
  ROLE: { SUPER_ADMIN: 'SA', COMPANY_ADMIN: 'CA', HR: 'HR', EMPLOYEE: 'EMP', PROJECT_MANAGER: 'PM' },
  TIMER_TYPE: { WORK: 'work', MEETING: 'meeting', ACTIVITY: 'activity', BREAK: 'break', MANUAL: 'manual' },
  LEAVE_STATUS: { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected', CANCELLED: 'cancelled' },
  TIME_REQUEST_STATUS: { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected', CANCELLED: 'cancelled' },
  FILE_FORMATS: { EXCEL: 'excel', PDF: 'pdf' },
  LEAVE_TYPE: { PAID: 'PL', UNPAID: 'UPL', COMPOFF: 'CL' },
  LEAVE_PERIOD: { FULL_DAY: 'full-day', HALF_DAY: 'half-day', FIRST_HALF: 'first-half', SECOND_HALF: 'second-half' },
  COMPOFF_TYPE: { DAILY: 'daily', MONTHLY: 'monthly' },
  COMPOFF_STATUS: { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' },
  COMPOFF_COUNT: { HALF: 0.5, FULL: 1 },
  LEAVE_TYPES: [
    { name: 'Paid Leave', value: 'PL' },
    { name: 'Unpaid Leave', value: 'UPL' },
    { name: 'Comp Off', value: 'CL' },
  ],
};

export default constants;
