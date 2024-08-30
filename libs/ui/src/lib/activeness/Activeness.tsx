export const renderActiveness = (active: string) => {
  return active === 'y' ? (
    <span className="bg-green-400 p-2 rounded-lg text-white">Active</span>
  ) : (
    <span className="bg-red-400 p-2 rounded-full text-white">Inactive</span>
  );
};
