import express from "express";
import cors from "cors";
import { config } from "dotenv";
config();
import { authRouter } from "./src/routes/authRoute";
import { connectMongoDB } from "./src/lib/connectDb";
import assetLink from "./src/constant/assetlinks.json";
import { OAuth2Client } from "google-auth-library";
import { profileRouter } from "./src/routes/profileRoute";
import { verifyToken } from "./src/middleware/verifyToken";
import { upload, uploadToCloud } from "./src/config/upload";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

const port = process.env.PORT || 8000;

app.use("/api/auth", authRouter);
app.use("/api/user", verifyToken, profileRouter);

app.use("/.well-known/assetlinks.json", (req, res) => {
  res.status(200).json(assetLink);
});

app.post("/upload", upload.any(), async (req, res) => {
  if (req.file) {
    uploadToCloud(req, res);
  } else {
    res?.status(404).json({ message: "File required!" });
  }
});

connectMongoDB();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
