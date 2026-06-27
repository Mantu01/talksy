import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  secure_url: string;
  [key: string]: unknown;
}

const uploadOnCloudinary = async (localFilePath: string): Promise<CloudinaryUploadResult | null> => {
  try {
    if (!localFilePath) return null;
    try {
      const result = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto",
        folder: "/talksy",
      });
      fs.unlinkSync(localFilePath);
      return result as CloudinaryUploadResult;
    } catch (uploadError) {
      const fileName = path.basename(localFilePath);
      const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
      fs.mkdirSync(publicUploadsDir, { recursive: true });
      const destPath = path.join(publicUploadsDir, fileName);
      fs.renameSync(localFilePath, destPath);
      return { secure_url: `/public/uploads/${fileName}` };
    }
  } catch (error) {
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (unlinkError) {
      console.error(unlinkError);
    }
    return null;
  }
};

export { uploadOnCloudinary };