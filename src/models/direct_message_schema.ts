import mongoose, { Schema } from "mongoose";

const oneToOneMessageSchema = new Schema({
  directMessage: { type: Schema.Types.ObjectId, ref: 'DirectMessage' },
  sender: { type: Schema.Types.ObjectId, ref: 'User' },
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { 
  timestamps: true
});

const directMessageSchema = new Schema({
  participants: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  }],
  latestMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true
});

directMessageSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    next(new Error('Direct message must have exactly 2 participants'));
  }
  next();
});

directMessageSchema.index({ participants: 1 });

export const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);
export const OneToOneMessage = mongoose.model('OneToOneMessage', oneToOneMessageSchema);
