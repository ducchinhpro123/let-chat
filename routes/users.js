import UserController from '../controller/user_controller.js';
import { Router } from "express";

const router = Router();


router.get('/login', UserController.login);
router.get('/register', UserController.register);

export default router;
