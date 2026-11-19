import express from 'express';
import multer from 'multer';
import { cloudinaryReady, optimizedAssetUrl, uploadImage } from '../services/cloudinary.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = express.Router();

export default function uploadRoutes(auth) {
  router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
      const kind = req.body.kind;
      if (!['profile', 'product', 'chat', 'review', 'id', 'proof'].includes(kind)) return res.status(400).json({ message: 'Invalid upload type.' });
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']);
      if (!req.file || !allowedTypes.has(req.file.mimetype)) return res.status(400).json({ message: 'Upload a JPEG, PNG, WEBP, GIF, MP4, MOV, or WEBM file.' });
      if (req.file.size > 5 * 1024 * 1024) return res.status(400).json({ message: 'Image must be 5 MB or smaller.' });
      if (!cloudinaryReady()) return res.status(503).json({ message: 'Cloudinary is not configured. Add the Cloudinary environment variables.' });
      const result = await uploadImage(req.file, kind);
      res.status(201).json(kind === 'id' ? { assetId: result.public_id, private: true } : { assetId: result.public_id, url: optimizedAssetUrl(result.public_id, req.file.mimetype), fileType: req.file.mimetype });
    } catch (error) {
      console.error(`Cloudinary upload failed: ${error.message}`);
      res.status(502).json({ message: 'Photo upload failed. Check the Cloudinary configuration.' });
    }
  });
  return router;
}
