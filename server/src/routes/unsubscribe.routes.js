import { Router } from 'express';
import { unsubscribe, unsubscribeOneClick } from '../controllers/unsubscribe.controller.js';

const router = Router();

// Public by design: recipients click this from an email footer, where no
// session exists. The signed token is the authentication.
router.get('/', unsubscribe);
// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post).
router.post('/', unsubscribeOneClick);

export default router;
