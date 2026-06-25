import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({
  path: './.env'
})

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
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
      folder:'/talksy'
    });
    fs.unlinkSync(localFilePath);
    return result as CloudinaryUploadResult;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (unlinkError) {
      console.error("Error deleting local file:", unlinkError);
    }
    return null;
  }
};

export { uploadOnCloudinary };