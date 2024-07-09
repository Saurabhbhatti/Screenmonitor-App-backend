import mongoose from "mongoose";

// Define the schema for the project collection
const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true }, 
    status: {
      type: String, 
      enum: ["active", "inactive"],
      default: "active", 
      required: false,
    },
    isScreenshot: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Project = mongoose.model("project", projectSchema);

export default Project;
