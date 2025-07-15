import { Response } from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event';
import Booking from '../models/Booking';
import User from '../models/User';
import { AuthRequest } from '../types';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Get basic counts
    const [totalEvents, totalBookings, totalUsers, totalRevenue] = await Promise.all([
      Event.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      User.countDocuments({ role: 'user' }),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    // Get monthly booking trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyBookings = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          seats: { $sum: '$seatsBooked' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get most popular events
    const popularEvents = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: '$event',
          totalBookings: { $sum: 1 },
          totalSeats: { $sum: '$seatsBooked' },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $project: {
          eventId: '$_id',
          title: '$event.title',
          category: '$event.category',
          date: '$event.date',
          totalBookings: 1,
          totalSeats: 1,
          totalRevenue: 1
        }
      }
    ]);

    // Get category-wise statistics
    const categoryStats = await Event.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'event',
          as: 'bookings'
        }
      },
      {
        $group: {
          _id: '$category',
          eventCount: { $sum: 1 },
          totalBookings: {
            $sum: {
              $size: {
                $filter: {
                  input: '$bookings',
                  cond: { $eq: ['$this.status', 'confirmed'] }
                }
              }
            }
          },
          totalRevenue: {
            $sum: {
              $reduce: {
                input: {
                  $filter: {
                    input: '$bookings',
                    cond: { $eq: ['$this.status', 'confirmed'] }
                  }
                },
                initialValue: 0,
                in: { $add: ['$value', '$this.totalAmount'] }
              }
            }
          }
        }
      },
      { $sort: { totalBookings: -1 } }
    ]);

    // Get recent bookings
    const recentBookings = await Booking.find({ status: 'confirmed' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email')
      .populate('event', 'title date venue')
      .lean();

    // Get upcoming events
    const upcomingEvents = await Event.find({
      date: { $gte: new Date() }
    })
      .sort({ date: 1 })
      .limit(5)
      .select('title date venue availableSeats totalSeats')
      .lean();

    res.json({
      success: true,
      data: {
        overview: {
          totalEvents,
          totalBookings,
          totalUsers,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        monthlyBookings,
        popularEvents,
        categoryStats,
        recentBookings,
        upcomingEvents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getRevenueStats = async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month' } = req.query;

    let dateRange: Date;
    let groupBy: any;

    switch (period) {
      case 'week':
        dateRange = new Date();
        dateRange.setDate(dateRange.getDate() - 7);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'year':
        dateRange = new Date();
        dateRange.setFullYear(dateRange.getFullYear() - 1);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default: // month
        dateRange = new Date();
        dateRange.setMonth(dateRange.getMonth() - 1);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    const revenueData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 },
          seats: { $sum: '$seatsBooked' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      success: true,
      data: { revenueData }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};