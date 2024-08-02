import cloud from "cloudinary";
import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { promisify } from "util";

export interface IDocument {
  imageUrl: string;
  publicId: string;
  fileName: string;
}

const cloudinary = cloud.v2;
const unlinkAsync = promisify(fs.unlink);

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
  if (req?.file) {
    return await new Promise((resolve, reject) => {
      // Upload the file to Cloudinary
      cloudinary.uploader.upload(
        req?.file?.path!,
        { folder: req?.body?.type },
        async (error, result) => {
          if (error) {
            reject(error);
          }
          // Check if file exists before deleting
          const filePath = req?.file?.path!;
          if (fs.existsSync(filePath)) {
            await unlinkAsync(filePath);
            console.log(`File ${filePath} deleted successfully.`);
          } else {
            console.log(`File ${filePath} does not exist.`);
          }

          // Respond with the URL of the uploaded file
          resolve({
            fileUrl: result?.secure_url,
            fileName: result?.original_filename,
            fileSize: result?.bytes,
            fileFormat: result?.format,
          });
        }
      );
    });
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
};
