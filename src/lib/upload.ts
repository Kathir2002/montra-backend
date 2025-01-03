import cloud from "cloudinary";
import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { promisify } from "util";
import { mimeTypeMap } from "../constant/mimeTypes";

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
            fileFormat: mimeTypeMap[result?.format as string],
          });
        }
      );
    });
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
};

const getPublicIdFromUrl = (url: string) => {
  // Remove the Cloudinary domain and folder structure
  const regex = /\/upload\/(?:v\d+\/)?(.+?)\.[a-z]+$/; // Matches after /upload/ and before the extension
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const deleteCloudinaryDocument = async (url: string) => {
  try {
    const publicId = getPublicIdFromUrl(url);
    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log("Delete result:", result);
      return result;
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};
