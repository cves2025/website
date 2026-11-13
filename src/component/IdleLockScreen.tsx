/**
 * Lock screen of the idle lock: covers the whole panel (blurred, cannot be
 * closed) until the signed-in user enters their password again. The
 * password is checked by Firebase (re-authentication), not just compared on
 * screen. Too many wrong tries, or "Log out", signs the user out.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Lock } from "lucide-react";

import { IDLE_LOCK_MAX_ATTEMPTS } from "../constants";
import CustomButton from "../custom-components/CustomButton";
import CustomInput from "../custom-components/CustomInput";
import { auth } from "../firebase/config";

interface IdleLockScreenProps {
  email: string;
  name: string;
  onUnlock: () => void;
  onLogout: () => void;
}

function IdleLockScreen({ email, name, onUnlock, onLogout }: IdleLockScreenProps) {
  const { control, handleSubmit, reset } = useForm<{ password: string }>({ defaultValues: { password: "" } });
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const unlock = handleSubmit(async ({ password }) => {
    const current = auth.currentUser;
    if (!current || !email) {
      onLogout();
      return;
    }
    setChecking(true);
    setError("");
    try {
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(email, password));
      reset({ password: "" });
      onUnlock();
    } catch (cause) {
      const code = (cause as { code?: string })?.code ?? "";
      const tries = attempts + 1;
      setAttempts(tries);
      reset({ password: "" });
      if (tries >= IDLE_LOCK_MAX_ATTEMPTS) {
        onLogout();
        return;
      }
      setError(
        code === "auth/network-request-failed"
          ? "No internet connection. Please try again."
          : code === "auth/too-many-requests"
            ? "Too many tries. Please wait a moment and try again."
            : `Wrong password. ${IDLE_LOCK_MAX_ATTEMPTS - tries} ${IDLE_LOCK_MAX_ATTEMPTS - tries === 1 ? "try" : "tries"} left before you are logged out.`
      );
    } finally {
      setChecking(false);
    }
  });

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-lock-title"
    >
      <form onSubmit={(event) => void unlock(event)} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" noValidate>
        <div className="mb-4 flex flex-col items-center text-center">
          <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-cves text-white shadow-md">
            <Lock className="h-6 w-6" />
          </span>
          <h2 id="idle-lock-title" className="text-lg font-bold text-gray-900">
            Locked for your safety
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            No activity for 5 minutes. {name ? `${name}, enter` : "Enter"} your password to continue.
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-gray-700">{email}</p>
        </div>

        <CustomInput
          control={control}
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          autoFocus
          rules={{ required: "Enter your password." }}
        />
        {error && <p className="mt-2 text-sm font-medium text-red-600" role="alert">{error}</p>}

        <div className="mt-5 flex flex-col gap-2">
          <CustomButton type="submit" variant="cves" disabled={checking}>
            {checking ? "Checking..." : "Unlock"}
          </CustomButton>
          <CustomButton type="button" variant="outline" onClick={onLogout} disabled={checking}>
            Log out
          </CustomButton>
        </div>
      </form>
    </div>
  );
}

export default IdleLockScreen;
