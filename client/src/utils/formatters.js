export const formatCurrency = (amount, symbol = '₹') => {
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const getStockBadge = (currentStock, threshold = 10) => {
  if (currentStock <= 0) {
    return {
      label: 'Out of Stock',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }
  if (currentStock <= threshold) {
    return {
      label: 'Low Stock',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  return {
    label: 'In Stock',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
};
