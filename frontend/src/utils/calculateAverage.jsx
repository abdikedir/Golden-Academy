export const calculateAverage = (marks = []) => {
  if (!marks.length) return 0;
  const total = marks.reduce(
    (sum, item) => sum + Number(item.mark_obtained || 0),
    0,
  );
  return Number((total / marks.length).toFixed(2));
};
