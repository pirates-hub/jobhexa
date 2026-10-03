export const formatDate = (date) => {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatCurrency = (amount) => {
  if (!amount || amount === 0) return 'Free';
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const daysUntil = (date) => {
  const target = new Date(date);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getDeadlineColor = (date) => {
  const days = daysUntil(date);
  if (days <= 3) return 'text-red-600';
  if (days <= 7) return 'text-yellow-500';
  return 'text-green-600';
};

export const getJobStatusBadge = (status) => {
  const map = {
    active: { text: 'Active', color: 'bg-green-100 text-green-800' },
    upcoming: { text: 'Upcoming', color: 'bg-blue-100 text-blue-800' },
    closed: { text: 'Closed', color: 'bg-gray-100 text-gray-800' },
    expired: { text: 'Expired', color: 'bg-red-100 text-red-800' },
  };
  return map[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
};

export const getEligibilityBadge = (eligible) => {
  if (eligible) {
    return { text: 'Eligible', color: 'bg-green-100 text-green-800' };
  }
  return { text: 'Not Eligible', color: 'bg-red-100 text-red-800' };
};
