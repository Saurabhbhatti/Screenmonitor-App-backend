import mongoose, { Schema } from 'mongoose';

import IUser from '../interfaces/user';
import constants from '../helpers/constants';

// Define the schema for the User collection
const userSchema: Schema<IUser> = new Schema(
  {
    firstName: { type: String, required: [true, 'First name is required'] },
    lastName: { type: String, required: [true, 'Last name is required'] },
    designation: { type: String, required: false },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: [true, 'Email address is required'], // Required field with error message if not provided
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please fill a valid email address', // Regex validation for email format
      ],
    },
    password: { type: String, required: [true, 'Password is required'] },
    phone: { type: String, required: false, unique: true },
    status: {
      type: String,
      enum: [constants.STATUS.ACTIVE, constants.STATUS.INACTIVE],
      default: 'active',
      required: false,
    },
    role: {
      type: String,
      enum: [constants.ROLE.SUPER_ADMIN, constants.ROLE.COMPANY_ADMIN, constants.ROLE.HR, constants.ROLE.EMPLOYEE, constants.ROLE.PROJECT_MANAGER],
      required: true,
    },
    isNewUser: {
      type: Boolean,
      default: true,
    },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: false },
    empCode: { type: String, unique: true, trim: true, required: true, uppercase: true },
  },
  {
    timestamps: true,
  },
);

// Middleware to execute before saving a user document
userSchema.pre('save', function (next) {
  if (this.role === constants.ROLE.SUPER_ADMIN) {
    this.isNewUser = false;
  }
  next();
});

// Method to customize JSON representation of the user object
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Phone must be unique validation after saving document
userSchema.post('save', function (error: any, _doc: any, next: any) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    if (error.keyValue.phone) {
      next(new Error('Phone number already exists, please use another number'));
    } else if (error.keyValue.empCode) {
      next(new Error('Employee code already exists, please use another code'));
    } else if (error.keyValue.email) {
      next(new Error('Email address already exists, please use another email'));
    }
  } else {
    next();
  }
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
