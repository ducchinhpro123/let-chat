import {Router} from 'express';

import IndexController from '../controller/index_controller.js';
import { verifyLogin } from '../middleware/verify_login.js';

const router = Router();

router.get('/', verifyLogin, IndexController.index);

export default router;
