"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventController_1 = require("../controllers/eventController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public routes
router.get('/', eventController_1.getEvents);
router.get('/categories', eventController_1.getEventCategories);
router.get('/locations', eventController_1.getEventLocations);
router.get('/:id', eventController_1.getEvent);
// Protected routes (Admin only)
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('admin'), validation_1.validateEvent, eventController_1.createEvent);
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), validation_1.validateEvent, eventController_1.updateEvent);
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), eventController_1.deleteEvent);
exports.default = router;
//# sourceMappingURL=events.js.map