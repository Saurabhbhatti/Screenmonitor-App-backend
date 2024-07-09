import mongoose from "mongoose";

// Define the schema for the User collection
const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: [true, "First name is required"],
    },
    last_name: {
      type: String,
      required: [true, "Last name is required"],
    },
    company_name: {
      type: String,
      required: false,
    },
    member_type: {
      type: String,
      required: false,
    },
    projects: {
      type: [String],
      required: false,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: [true, "Email address is required"], // Required field with error message if not provided
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address", // Regex validation for email format
      ],
      validate: {
        validator: async function (email) {
          const user = await User.findOne({ email });
          if (user) {
            throw new Error("Email already exists in the database"); // Custom validation to check uniqueness of email
          }
        },
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"], // Required field with error message if not provided
    },
    phone: {
      type: String,
      required: false, // Optional field
      unique: true, // Unique constraint for phone number
    },
    status: {
      type: String,
      enum: ["active", "inactive"], // Enum field with predefined values
      default: "active", // Default value if not specified
      required: false, // Optional field
    },
    role: {
      type: String,
      enum: ["admin", "user"], // Enum field with predefined values
      required: true, // Required field
    },
    isNewUser: {
      type: Boolean,
      default: true, // Default value for isNewUser field
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

// Middleware to execute before saving a user document
userSchema.pre("save", function (next) {
  if (this.role === "admin") {
    this.isNewUser = false; // Set isNewUser to false if the user role is admin
  }
  next();
});

// Method to customize JSON representation of the user object
userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password; // Exclude password field from JSON output
  delete userObject.tokens; // Assuming tokens are another field to exclude, if present

  return userObject;
};

const User = mongoose.model("User", userSchema);

export default User;
