"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
router.post("/register", validation_1.validateRegister, authController_1.register);
router.post("/register-admin", validation_1.validateRegister, authController_1.registerAdmin);
router.post("/login-admin", validation_1.validateLogin, authController_1.loginAdmin);
router.post("/login", validation_1.validateLogin, authController_1.login);
router.get("/profile", auth_1.authenticate, authController_1.getProfile);
exports.default = router;
//# sourceMappingURL=auth.js.map