import mongoose from "mongoose";

export const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_CONNECT_URI as string, {
      dbName: "montra",
    });
    console.log("Connected to MongoDB");
  } catch (err: any) {
    console.log("Error in connecting to database", err?.message);
  }
};
