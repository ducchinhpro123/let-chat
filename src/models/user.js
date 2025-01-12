import mongoose, { Schema } from "mongoose";
const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    status: { type: String, enum: ["online", "offline"], default: "offline" },
    createdAt: { type: Date, default: Date.now },
    contacts: [{ type: Schema.Types.ObjectId, ref: "User" }],
    friends: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    ],
});
export const User = mongoose.model("User", userSchema);
//# sourceMappingURL=user.js.map