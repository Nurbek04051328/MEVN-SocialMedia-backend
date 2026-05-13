import express from 'express';
import { upload } from '../middlewares/multer.middleware'; 
import { verifyJWT } from '../middlewares/auth.middleware';
import { 
  loginUser, 
  logoutUser, 
  registerUser 
} from '../controllers/user.controller';

const router = express.Router();

router.route("/register").post(upload.single("profileImage"), registerUser);
router.route("/login").post(loginUser);

// Secured routes
router.route("/logout").get(verifyJWT, logoutUser);

export default router;