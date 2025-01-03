import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./user";

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId | IUser;
  content: string;
  createdAt: Date;
}

export interface IMessagePopulated extends Omit<IMessage, 'sender'> {
  sender: IUser;  
}

const messageSchema: Schema<IMessage> = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);
