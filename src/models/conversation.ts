import mongoose, { Schema, Document, Types } from "mongoose";

interface IParticipant {
  _id: any;
  user: Types.ObjectId,
  role: 'member' | 'admin'
}

interface IConversation extends Document {
  type: 'public' | 'private',
  name: string,
  participants: IParticipant[],
  latestMessage: Types.ObjectId,
  createdAt: Date, 
  updatedAt: Date
} 

const conversationSchema = new Schema<IConversation>({
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

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
export type { IConversation, IParticipant };

