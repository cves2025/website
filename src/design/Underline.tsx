interface UnderlineProps {
  color?: string;
  width?: string;
  height?: string;
  className?: string;
}

const Underline = ({
  color = "bg-blue-500",
  width = "w-50",
  height = "h-2",
  className = "",
}: UnderlineProps) => {
  return (
    <div
      className={`${width} ${height} ${color} ${className} -skew-x-24 bg-gradient-to-r from-amber-600 to-yellow-300`}
    />
  );
};

export default Underline;