import Notification from '../models/Notification.js';
export const getNotifications = async (req, res) => {
  const notifs = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).populate('jobId', 'title slug');
  res.json({ success: true, data: { notifications: notifs } });
};
export const getUnreadCount = async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
  res.json({ success: true, data: { count } });
};
export const markAsRead = async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true });
  res.json({ success: true, data: { message: 'Marked as read' } });
};
export const markAllAsRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true, data: { message: 'All marked as read' } });
};
export const deleteNotification = async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true, data: { message: 'Deleted' } });
};
