import cloud, { UploadApiResponse, UploadResponseCallback } from "cloudinary";
import multer from "multer";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { Request, Response } from "express";
config();

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

export const uploadToCloud = async (req: Request, res: Response) => {
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
};
