import { ObjectId } from 'mongoose';

import constants from '../helpers/constants';

export default interface IUser {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  designation: string;
  email: string;
  password: string;
  phone: string;
  status: typeof constants.STATUS.ACTIVE | typeof constants.STATUS.INACTIVE;
  role:
    | typeof constants.ROLE.SUPER_ADMIN
    | typeof constants.ROLE.COMPANY_ADMIN
    | typeof constants.ROLE.HR
    | typeof constants.ROLE.EMPLOYEE
    | typeof constants.ROLE.PROJECT_MANAGER;
  isNewUser: boolean;
  companyId?: ObjectId;
  empCode: string;
}
