import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./user";

interface IFriendRelationShip extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface IFriendRelationshipPopulated extends Omit<IFriendRelationShip, 'requester' | 'recipient'> {
  requester: Pick<IUser, '_id' | 'username'>,
  recipient: Pick<IUser, '_id' | 'username'>,
}

const friendRelationshipSchema: Schema<IFriendRelationShip> = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

export const FriendRelationship: Model<IFriendRelationShip> = mongoose.model<IFriendRelationShip>('FriendRelationship', friendRelationshipSchema);
