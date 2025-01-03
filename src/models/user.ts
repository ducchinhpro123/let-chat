import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  password: string;
  status: 'online' | 'offline';
  createdAt: Date;
  contacts: mongoose.Types.ObjectId[];
  friends: mongoose.Types.ObjectId[];
}

const userSchema: Schema<IUser> = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  createdAt: { type: Date, default: Date.now },
  contacts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
});

export const User = mongoose.model<IUser>('User', userSchema);
