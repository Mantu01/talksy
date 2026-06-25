import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGroup extends Document {
  title: string;
  description: string;
  logo: string;
  createdBy: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  joinRequests: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  logo: {
    type: String,
    default: ""
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }],
  joinRequests: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }]
}, { timestamps: true });

const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>("Group", groupSchema);

export default Group;
