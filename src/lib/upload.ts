import cloud from "cloudinary";
import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

export interface IDocument {
  imageUrl: string;
  publicId: string;
  fileName: string;
}

const cloudinary = cloud.v2;

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

export const upload = multer({ storage: storage });

export const uploadToCloud = async (req: Request, res: Response) => {
  console.log(req?.file, "req?.file");
  // Upload the file to Cloudinary
  if (req.file) {
    // Upload the file to Cloudinary
    cloudinary.uploader.upload(
      req?.file?.path,
      //   { folder: "sample_upload" },
      (error, result) => {
        if (error) {
          return res.status(500).send(error);
        }

        // Delete the file from the local filesystem
        fs.unlinkSync(req?.file?.path!);

        // Respond with the URL of the uploaded file
        return {
          fileUrl: result?.secure_url,
          fileName: result?.original_filename,
          fileSize: result?.bytes,
        };
      }
    );
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
};
