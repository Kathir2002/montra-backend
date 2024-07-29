import express from "express";
import cors from "cors";
import { config } from "dotenv";
config();
import { authRouter } from "./src/routes/authRoute";
import { connectMongoDB } from "./src/lib/connectDb";
import assetLink from "./src/constant/assetlinks.json";
import cloud from "cloudinary";
import { profileRouter } from "./src/routes/profileRoute";
import { verifyToken } from "./src/middleware/verifyToken";
import multer from "multer";
import path from "path";
import fs from "fs";

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

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append the file extension
  },
});

export const upload = multer({ storage: storage });

app.use("/api/auth", authRouter);
app.use("/api/user", verifyToken, profileRouter);

app.use("/.well-known/assetlinks.json", (req, res) => {
  res.status(200).json(assetLink);
});

app.post("/upload", upload.any(), async (req, res) => {
  console.log(req?.file, "req?.file");
  // Upload the file to Cloudinary
  if (req.file) {
    // Upload the file to Cloudinary
    cloudinary.uploader.upload(
      req?.file?.path,
      { folder: "your_folder_name" },
      (error, result) => {
        if (error) {
          return res.status(500).send(error);
        }

        // Delete the file from the local filesystem
        fs.unlinkSync(req?.file?.path!);

        // Respond with the URL of the uploaded file
        res.json({ imageUrl: result?.secure_url, publicId: result?.public_id });
      }
    );
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
});

connectMongoDB();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
