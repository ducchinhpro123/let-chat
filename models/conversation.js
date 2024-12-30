import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema({
  type: { type: String, enum: ['public', 'private'], required: true},
  name: { type: String, required: true },
  participants: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
  }],
  latestMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Conversation = mongoose.model('Conversation', conversationSchema);
