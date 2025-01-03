import mongoose, { Schema, Document, Model } from "mongoose";

interface IFriendRelationShip extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

const friendRelationshipSchema: Schema<IFriendRelationShip> = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

export const FriendRelationship: Model<IFriendRelationShip> = mongoose.model<IFriendRelationShip>('FriendRelationship', friendRelationshipSchema);
