import mongoose from 'mongoose';
import { DB_NAME } from '../constants';

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log(`\n MongoDB connected successfully!!!  DB Host: ${connectionInstance.connection.host}`);
    
  } catch (error) {
    console.error("Mongo connection ErrorL: ", error);
    process.exit(1)
  }
}

export default connectDB