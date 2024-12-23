import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Message = mongoose.model('Message', messageSchema);
