import { Router } from 'express';
import { unsubscribe } from '../controllers/unsubscribe.controller.js';

const router = Router();

// Public by design: recipients click this from an email footer, where no
// session exists. The signed token is the authentication.
router.get('/', unsubscribe);

export default router;
