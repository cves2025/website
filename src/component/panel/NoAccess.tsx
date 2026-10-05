import type { AccessState } from "../context/MyContextProvider";

interface NoAccessProps {
  state: AccessState;
  onLogout: () => void;
}

const MESSAGES: Record<AccessState, { title: string; body: string }> = {
  ok: { title: "", body: "" },
  "no-profile": {
    title: "Account not set up",
    body: "Your login is not linked to a school profile yet. Please contact the school admin.",
  },
  "invalid-role": {
    title: "No role assigned",
    body: "Your account has no role assigned. Please contact the school admin.",
  },
  inactive: {
    title: "Account inactive",
    body: "This account is inactive or has been removed. Please contact the school admin.",
  },
  "profile-error": {
    title: "Could not load your profile",
    body: "Something went wrong while loading your account. Please try again.",
  },
};

function NoAccess({ state, onLogout }: NoAccessProps) {
  const { title, body } = MESSAGES[state];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
        <div className="mt-6 flex justify-center gap-3">
          {state === "profile-error" && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoAccess;