import { Link } from "react-router-dom";

function Unauthorized() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Access denied</h1>
        <p className="mt-2 text-sm text-gray-600">
          You do not have permission to open this page. If you think this is a
          mistake, please contact the school admin.
        </p>
        <Link
          to="/welcome"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export default Unauthorized;