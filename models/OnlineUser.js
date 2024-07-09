import mongoose from "mongoose";

const OnlineUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    checkinId: { type: mongoose.Schema.Types.ObjectId , required: true, ref: "Timer" },
  },
  { timestamps: true }
);

const OnlineUser = mongoose.model("OnlineUser", OnlineUserSchema);

export default OnlineUser;
