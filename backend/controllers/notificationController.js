const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Clean up any legacy read notifications
    await Notification.deleteMany({ recipient: req.user._id, isRead: true });

    const count = await Notification.countDocuments({ recipient: req.user._id });
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return successResponse(res, {
      notifications,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit)
      }
    }, 'Notifications fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    // Delete any marked read ones
    await Notification.deleteMany({ recipient: req.user._id, isRead: true });

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id
    });
    return successResponse(res, { unreadCount }, 'Unread count fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    // Once read, delete notification automatically from database
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return errorResponse(res, 'Notification not found or unauthorized', 404);
    }

    return successResponse(res, notification, 'Notification read and deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    // Delete all notifications for the user
    await Notification.deleteMany({ recipient: req.user._id });
    return successResponse(res, null, 'All notifications read and deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return errorResponse(res, 'Notification not found or unauthorized', 404);
    }

    return successResponse(res, null, 'Notification deleted successfully');
  } catch (error) {
    next(error);
  }
};
