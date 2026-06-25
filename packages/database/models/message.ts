import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  recipient?: mongoose.Types.ObjectId;
  group?: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: "Group"
  },
  text: {
    type: String,
    required: true
  }
}, { timestamps: true });

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>("Message", messageSchema);

export default Message;
