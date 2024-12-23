import UserController from '../controller/user_controller.js';
import { Router } from "express";
import { checkAuthentication } from '../middleware/check_authentication.js';
import { loginValidation } from '../middleware/login_validation.js';
import { registerValidation } from '../middleware/register_validation.js';

const router = Router();

router.get('/authentication', checkAuthentication, UserController.authentication);
router.get('/register', UserController.register);
router.get('/login', UserController.login);
router.post('/register', registerValidation,  UserController.handleRegister);
router.post('/login', loginValidation, UserController.handleLogin);
router.post('/logout', UserController.logout);

export default router;
