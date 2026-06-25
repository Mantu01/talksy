import bcrypt from "bcryptjs";
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  bio: string;
  dob: string;
  profile: string;
  banner: string;
  friends: mongoose.Types.ObjectId[];
  friendRequestsSent: mongoose.Types.ObjectId[];
  friendRequestsReceived: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  bio: {
    type: String,
    default: ""
  },
  dob: {
    type: String,
    default: ""
  },
  profile: {
    type: String,
    default: ""
  },
  banner: {
    type: String,
    default: ""
  },
  friends: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }],
  friendRequestsSent: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }],
  friendRequestsReceived: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }]
}, { timestamps: true });

userSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;