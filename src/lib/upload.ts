import cloud from "cloudinary";
import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer, { FileFilterCallback } from "multer";
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

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedFileTypes = [
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/pdf", // .pdf
    "image/jpeg", // .jpg or .jpeg
    "image/png", // .png
  ];

  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true); // File is valid
  } else {
    cb(
      new Error(
        "Invalid file type. Only Word documents, PDFs, and images are allowed!"
      )
    );
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB file size limit
});

export const uploadToCloud = async (req: Request, res: Response) => {
  if (req?.file) {
    return await new Promise((resolve, reject) => {
      const fileExtension = path
        .extname(req?.file?.originalname!)
        .toLowerCase();
      let resourceType = "raw"; // Default to raw for non-image files

      if ([".jpg", ".jpeg", ".png", ".gif", ".bmp"].includes(fileExtension)) {
        resourceType = "image"; // Image files
      }
      // Upload the file to Cloudinary
      cloudinary.uploader.upload(
        req?.file?.path!,
        { folder: req?.body?.type, resource_type: resourceType as any },
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
            fileFormat:
              mimeTypeMap[
                result?.url?.split(".")[
                  result?.url?.split(".")?.length - 1
                ] as string
              ],
          });
        }
      );
    });
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
};

const getPublicIdFromUrl = (url: string) => {
  // Remove the Cloudinary domain and capture everything after /upload/ including the extension
  const regex = url?.includes("/raw/upload/")
    ? /\/upload\/(?:v\d+\/)?(.+)$/
    : /\/upload\/(?:v\d+\/)?(.+?)\.[a-z]+$/;

  const match = url.match(regex);
  return match ? match[1] : null;
};

export const deleteCloudinaryDocument = async (url: string) => {
  try {
    const publicId = getPublicIdFromUrl(url);

    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: url?.includes("/raw/upload/") ? "raw" : "image",
      });
      console.log("Delete result:", result);
      return result;
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};
