const colorMap = {
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-800',
};

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

function Badge({ children, color = 'gray', size = 'md', className = '' }) {
  return (
    <span
      className={`inline-block rounded-full font-medium max-w-full ${colorMap[color] || colorMap.gray} ${sizeMap[size] || sizeMap.md} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
