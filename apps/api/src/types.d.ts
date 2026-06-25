declare module "multer";

namespace Express {
  namespace Multer {
    interface File {
      path: string;
      originalname: string;
    }
  }
}
