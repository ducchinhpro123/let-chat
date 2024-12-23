import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema({
  type: { type: String, enum: ['public', 'private'], required: true},
  participants: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
  }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }

});

export const Conversation = mongoose.model('Conversation', conversationSchema);
