import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const uri: string = process.env.MONGODB_API || '';

if (!uri) {
  throw new Error('MONGDB_API is not found');
}

export function connectMongodb() {
  mongoose.connect(uri).then(() => console.log('connected succcessfully to MONGODB'))
  .catch(err => console.log("Cannot connected to MONGODB: ", err));
}

