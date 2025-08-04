"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.registerAdmin = exports.loginAdmin = exports.login = exports.register = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || "fallback-secret";
    const options = {
        expiresIn: (process.env.JWT_EXPIRE || "30d"),
    };
    return jsonwebtoken_1.default.sign({ id }, secret, options);
};
exports.generateToken = generateToken;
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email",
            });
        }
        // Create user
        const user = await User_1.default.create({
            name,
            email,
            password,
            role: role || "user",
        });
        const token = (0, exports.generateToken)(user._id);
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error registering user",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Check if user exists
        const user = await User_1.default.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }
        // Check password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }
        const token = (0, exports.generateToken)(user._id);
        res.json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error logging in",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.login = login;
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Check if user exists
        const user = await User_1.default.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }
        // Check if user is an admin
        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required.",
            });
        }
        // Check password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }
        const token = (0, exports.generateToken)(user._id);
        res.json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error logging in",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.loginAdmin = loginAdmin;
const registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Check if user exists
        let user = await User_1.default.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }
        // Create new admin user
        user = new User_1.default({
            name,
            email,
            password,
            role: "admin", // Explicitly set role to admin
        });
        // Save user
        await user.save();
        // Generate token
        const token = (0, exports.generateToken)(user._id);
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error registering admin",
            error: err instanceof Error ? err.message : "Unknown error",
        });
    }
};
exports.registerAdmin = registerAdmin;
const getProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt,
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching profile",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getProfile = getProfile;
//# sourceMappingURL=authController.js.map