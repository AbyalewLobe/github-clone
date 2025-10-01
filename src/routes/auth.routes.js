import express from 'express';
import authController from '../controllers/auth.controller.js'; // Add .js extension
import authMiddleware from '../middleware/authMiddleware.js';

const authRoutes = express.Router();

authRoutes.post('/signup', authController.signup);
authRoutes.post('/login', authController.login); // Fixed: added missing slash
authRoutes.post('/google',authController.googleLogin)
authRoutes.get('/profile',authMiddleware.protect, authController.getProfile)

export default authRoutes; 

