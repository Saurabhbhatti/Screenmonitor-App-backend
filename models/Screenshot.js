import mongoose from "mongoose";

const screenshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    screenshot: {
      fileName: { type: String, required: true }, 
      fileType: { type: String, required: true }, 
      fileUrl: { type: String, required: true }, 
    },
    uploadScreenshotDate: { type: Date, default: Date.now }, 
  },
  {
    timestamps: true, 
    toJSON: { getters: true }, // Enables getters for toJSON serialization
    toObject: { getters: true }, // Enables getters for toObject serialization
  }
);

const Screenshot = mongoose.model("Screenshot", screenshotSchema);

export default Screenshot;
