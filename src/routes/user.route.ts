import express from 'express';
import { upload } from '../middlewares/multer.middleware'; 
import { verifyJWT } from '../middlewares/auth.middleware';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  changeCurrentPassword,
  getCurrentUser,
  refreshAccessToken, 
  addBio,
  updateBio,
  updateProfileImage,
  getUserProfileData
} from '../controllers/user.controller';

const router = express.Router();

router.route("/register").post(upload.single("profileImage"), registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// Secured routes
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/add-bio").post(verifyJWT, addBio);
router.route("/update-bio").patch(verifyJWT, updateBio);
router.route("/update-profile-image")
  .patch(verifyJWT, upload.single("profileImage"), updateProfileImage);
  
router.route("/get-user-profile-data/:username").get(verifyJWT, getUserProfileData)

export default router;