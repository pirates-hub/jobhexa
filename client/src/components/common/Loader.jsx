const sizes = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

function Loader({ size = 'md' }) {
  return (
    <div className="flex justify-center items-center py-8">
      <div
        className={`${sizes[size]} border-primary-200 border-t-primary-700 rounded-full animate-spin`}
      />
    </div>
  );
}

export default Loader;
