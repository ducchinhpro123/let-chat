import mongoose, { Schema } from "mongoose";
const friendRelationshipSchema = new Schema({
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});
export const FriendRelationship = mongoose.model('FriendRelationship', friendRelationshipSchema);
//# sourceMappingURL=friend_relationship.js.map