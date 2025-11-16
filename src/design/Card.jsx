import { NavLink } from "react-router-dom";

const facilitiesImage = import.meta.glob(
  "/src/assets/image/facilities/*.{jpg,png,jpeg}",
  { eager: true, import: "default" }
);

function Card() {


  // Convert to array of objects with name and url
  const files = Object.entries(facilitiesImage).map(([path, module]) => {
    const fileName = path.split("/").pop();
    return {
      name: fileName.replace(/\.(jpg|jpeg|png)$/i, ""),
      url: module,
    };
  });

  return (
    <div className="flex flex-wrap justify-center gap-6 p-6">
      {files.map(({ name, url }, index) => (
        <div
          key={index}
          className="w-full max-w-sm border border-gray-300 rounded-lg shadow-lg bg-white overflow-hidden transform transition duration-300 hover:scale-105"
        >
          <img
            src={url}
            alt={name}
            className="w-full h-auto rounded-t-lg"
            loading="lazy"
          />
          <div className="p-4 text-center">
            <NavLink
              to={`/facilities/${name}`}
              className="text-lg font-semibold text-blue-600 hover:underline"
            >
              {name}
            </NavLink>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Card;
