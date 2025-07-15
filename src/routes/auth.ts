import { Router } from "express";
import {
  register,
  login,
  getProfile,
  registerAdmin,
  loginAdmin,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { validateRegister, validateLogin } from "../middleware/validation";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/register-admin", validateRegister, registerAdmin);
router.post("/login-admin", validateLogin, loginAdmin);
router.post("/login", validateLogin, login);
router.get("/profile", authenticate, getProfile);

export default router;
