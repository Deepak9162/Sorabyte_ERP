/**
 * Notification Helper
 * 
 * Utility for programmatically creating in-app notifications.
 * Used by controllers/services when system events occur
 * (e.g., Class Teacher changes, attendance locked/unlocked).
 */

const Notification = require('../models/Notification');

/**
 * Create a single notification
 * @param {Object} options
 * @param {string} options.recipientUserId - User ID of the recipient
 * @param {string} options.senderUserId - User ID of the sender (optional)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.type - 'info' | 'success' | 'warning' | 'error'
 * @param {string} options.link - Optional navigation link
 */
const createNotification = async ({
  recipientUserId,
  senderUserId = null,
  title,
  message,
  type = 'info',
  link = null,
}) => {
  try {
    if (!recipientUserId || !title || !message) {
      return null;
    }

    const notification = await Notification.create({
      recipient: recipientUserId,
      sender: senderUserId,
      title,
      message,
      type,
      link,
    });

    return notification;
  } catch (error) {
    // Silent failure — notifications should never break core operations
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

/**
 * Create notifications for multiple recipients
 * @param {Array<string>} recipientUserIds - Array of User IDs
 * @param {Object} notificationData - { senderUserId, title, message, type, link }
 */
const createBulkNotifications = async (recipientUserIds, notificationData) => {
  const results = [];
  for (const recipientUserId of recipientUserIds) {
    const notification = await createNotification({
      recipientUserId,
      ...notificationData,
    });
    if (notification) results.push(notification);
  }
  return results;
};

module.exports = { createNotification, createBulkNotifications };
