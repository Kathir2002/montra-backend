import express from "express";
import cors from "cors";
import { config } from "dotenv";
config();
import { authRouter } from "./src/routes/authRoute";
import { connectMongoDB } from "./src/lib/connectDb";
import assetLink from "./src/constant/assetlinks.json";
import { OAuth2Client } from "google-auth-library";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

const port = process.env.PORT || 8000;

app.use("/api/auth", authRouter);

app.use("/.well-known/assetlinks.json", (req, res) => {
  res.status(200).json(assetLink);
});

connectMongoDB();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
