import express from "express";
import cors from "cors";
import { config } from "dotenv";
config();
import { authRouter } from "./src/routes/authRoute";
import { connectMongoDB } from "./src/lib/connectDb";
import assetLink from "./src/constant/assetlinks.json";
import cloud from "cloudinary";
import { accountRouter } from "./src/routes/accountRoute";
import { verifyToken } from "./src/middleware/verifyToken";
import { transactionRouter } from "./src/routes/transactionRoute";
import { budgetRouter } from "./src/routes/budgetRoutes";
import "./src/helper/jobScheduler";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: "*" }));

const port = process.env.PORT || 8000;

const cloudinary = cloud.v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use("/api/auth", authRouter);
app.use("/api/account", verifyToken, accountRouter);
app.use("/api/transaction", verifyToken, transactionRouter);
app.use("/api/budget", verifyToken, budgetRouter);

app.use("/.well-known/assetlinks.json", (req, res) => {
  res.status(200).json(assetLink);
});

connectMongoDB();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
