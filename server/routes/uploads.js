import express from 'express';
import multer from 'multer';
import { cloudinaryReady, uploadImage } from '../services/cloudinary.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = express.Router();

export default function uploadRoutes(auth) {
  router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
      const kind = req.body.kind;
      if (!['profile', 'product', 'chat', 'review', 'id'].includes(kind)) return res.status(400).json({ message: 'Invalid upload type.' });
      if (!req.file || !req.file.mimetype.startsWith('image/')) return res.status(400).json({ message: 'Please upload an image.' });
      if (!cloudinaryReady()) return res.status(503).json({ message: 'Cloudinary is not configured. Add the Cloudinary environment variables.' });
      const result = await uploadImage(req.file, kind);
      res.status(201).json(kind === 'id' ? { assetId: result.public_id, private: true } : { assetId: result.public_id, url: result.secure_url });
    } catch (error) {
      console.error(`Cloudinary upload failed: ${error.message}`);
      res.status(502).json({ message: 'Photo upload failed. Check the Cloudinary configuration.' });
    }
  });
  return router;
}
