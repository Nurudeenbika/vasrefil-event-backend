"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const Event_1 = __importDefault(require("../models/Event"));
const Booking_1 = __importDefault(require("../models/Booking"));
dotenv_1.default.config();
const seedData = async () => {
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI ||
            "mongodb+srv://nurudeenhassan:Nurubika@cluster0.ri4ry38.mongodb.net/event-bookings?retryWrites=true&w=majority&appName=Cluster0");
        console.log("Connected to MongoDB");
        // Clear existing data
        await User_1.default.deleteMany({});
        await Event_1.default.deleteMany({});
        await Booking_1.default.deleteMany({});
        console.log("Cleared existing data");
        // Create admin user
        const adminPassword = await bcryptjs_1.default.hash("admin123", 12);
        const admin = await User_1.default.create([
            {
                name: "Admin User",
                email: "admin@eventbooking.com",
                password: adminPassword,
                role: "admin",
            },
            {
                name: "Admin",
                email: "nurudeenbika@gmail.com",
                password: adminPassword,
                role: "admin",
            },
        ]);
        // Create regular users
        const userPassword = await bcryptjs_1.default.hash("user123", 12);
        const users = await User_1.default.create([
            {
                name: "John Doe",
                email: "john@example.com",
                password: userPassword,
                role: "user",
            },
            {
                name: "Jane Smith",
                email: "jane@example.com",
                password: userPassword,
                role: "user",
            },
            {
                name: "Mike Johnson",
                email: "mike@example.com",
                password: userPassword,
                role: "user",
            },
        ]);
        // Create events
        const events = await Event_1.default.create([
            {
                title: "Tech Conference 2025",
                description: "Annual technology conference featuring latest trends in AI, ML, and Web Development.",
                category: "conference",
                location: "Lagos",
                venue: "Eko Convention Center",
                date: new Date("2025-07-15"),
                time: "09:00",
                price: 25000,
                totalSeats: 500,
                availableSeats: 500,
                createdBy: admin[0]._id,
            },
            {
                title: "JavaScript Workshop",
                description: "Hands-on workshop covering modern JavaScript frameworks and best practices.",
                category: "workshop",
                location: "Abuja",
                venue: "TechHub Abuja",
                date: new Date("2025-08-20"),
                time: "10:00",
                price: 15000,
                totalSeats: 50,
                availableSeats: 50,
                createdBy: admin[1]._id,
            },
            {
                title: "React Native Bootcamp",
                description: "Intensive 3-day bootcamp on React Native mobile app development.",
                category: "workshop",
                location: "Lagos",
                venue: "Co-Creation Hub",
                date: new Date("2025-09-10"),
                time: "09:00",
                price: 50000,
                totalSeats: 30,
                availableSeats: 30,
                createdBy: admin[0]._id,
            },
            {
                title: "Digital Marketing Summit",
                description: "Learn the latest digital marketing strategies and tools.",
                category: "seminar",
                location: "Port Harcourt",
                venue: "Hotel Presidential",
                date: new Date("2025-08-05"),
                time: "14:00",
                price: 20000,
                totalSeats: 200,
                availableSeats: 200,
                createdBy: admin[1]._id,
            },
            {
                title: "Startup Pitch Competition",
                description: "Annual startup pitch competition for early-stage companies.",
                category: "networking",
                location: "Lagos",
                venue: "Lagos Business School",
                date: new Date("2025-10-01"),
                time: "16:00",
                price: 5000,
                totalSeats: 300,
                availableSeats: 300,
                createdBy: admin[0]._id,
            },
            {
                title: "Blockchain and Cryptocurrency Seminar",
                description: "Explore the future of blockchain technology and cryptocurrencies.",
                category: "seminar",
                location: "Abuja",
                venue: "Transcorp Hilton",
                date: new Date("2025-11-10"),
                time: "11:00",
                price: 30000,
                totalSeats: 100,
                availableSeats: 100,
                createdBy: admin[1]._id,
            },
            {
                title: "AI in Healthcare Conference",
                description: "Discuss the impact of AI on healthcare and medical research.",
                category: "conference",
                location: "Lagos",
                venue: "Radisson Blu",
                date: new Date("2025-12-05"),
                time: "08:00",
                price: 40000,
                totalSeats: 250,
                availableSeats: 250,
                createdBy: admin[0]._id,
            },
            {
                title: "Cybersecurity Awareness Workshop",
                description: "Learn about the latest cybersecurity threats and how to protect your data.",
                category: "workshop",
                location: "Ibadan",
                venue: "University of Ibadan",
                date: new Date("2025-09-25"),
                time: "13:00",
                price: 10000,
                totalSeats: 100,
                availableSeats: 100,
                createdBy: admin[1]._id,
            },
            {
                title: "Cloud Computing Summit",
                description: "Explore the latest trends in cloud computing and its applications.",
                category: "seminar",
                location: "Enugu",
                venue: "Nike Lake Resort",
                date: new Date("2025-10-15"),
                time: "10:00",
                price: 35000,
                totalSeats: 150,
                availableSeats: 150,
                createdBy: admin[0]._id,
            },
        ]);
        // Create some bookings
        const bookings = await Booking_1.default.create([
            {
                user: users[0]._id,
                event: events[0]._id,
                seatsBooked: 2,
                totalAmount: 50000,
                status: "confirmed",
                bookingDetails: {
                    fullName: "John Doe",
                    email: "john@example.com",
                    phone: "+2348012345678",
                    emergencyContact: "Jane Doe",
                    emergencyPhone: "+2348098765432",
                    specialRequests: "Vegetarian meal",
                },
            },
            {
                user: users[1]._id,
                event: events[1]._id,
                seatsBooked: 1,
                totalAmount: 15000,
                status: "confirmed",
                bookingDetails: {
                    fullName: "Jane Smith",
                    email: "jane@example.com",
                    phone: "+2348011122233",
                    emergencyContact: "Tom Smith",
                    emergencyPhone: "+2348023344556",
                    specialRequests: "",
                },
            },
            {
                user: users[3]._id,
                event: events[3]._id,
                seatsBooked: 1000,
                totalAmount: 50000,
                status: "confirmed",
                bookingDetails: {
                    fullName: "Mike Johnson",
                    email: "mike@example.com",
                    phone: "+2348076543210",
                    emergencyContact: "Anna Johnson",
                    emergencyPhone: "+2348056677889",
                    specialRequests: "Wheelchair access",
                },
            },
        ]);
        // Update available seats for booked events
        await Event_1.default.findByIdAndUpdate(events[0]._id, {
            $inc: { availableSeats: -2 },
        });
        await Event_1.default.findByIdAndUpdate(events[1]._id, {
            $inc: { availableSeats: -1 },
        });
        await Event_1.default.findByIdAndUpdate(events[2]._id, {
            $inc: { availableSeats: -1 },
        });
        console.log("Seed data created successfully!");
        console.log(`Admin login: admin@eventbooking.com / admin123`);
        console.log(`User login examples: john@example.com / user123`);
        process.exit(0);
    }
    catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
};
seedData();
//# sourceMappingURL=seed.js.map