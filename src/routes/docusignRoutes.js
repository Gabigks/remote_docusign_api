import express from 'express';
import { postEnvelope } from '../controllers/docusignController.js';

const router = express.Router();

router.post("/form", postEnvelope);

export default router;
