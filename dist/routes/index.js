"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const events_1 = __importDefault(require("./events"));
const bookings_1 = __importDefault(require("./bookings"));
const dashboard_1 = __importDefault(require("./dashboard"));
const router = (0, express_1.Router)();
router.use('/auth', auth_1.default);
router.use('/events', events_1.default);
router.use('/bookings', bookings_1.default);
router.use('/dashboard', dashboard_1.default);
// Health check route
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Event Booking API is running',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map