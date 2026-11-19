/**
 * Lock screen of the idle lock: covers the whole panel (blurred, cannot be
 * closed) until the signed-in user enters their password, or their 4-digit
 * PIN when Settings > Lock & PIN says PIN and they have one.
 * - Password: checked by Firebase (re-authentication).
 * - PIN: checked by the server; "Use password instead" is always offered and
 *   a PIN locked after wrong tries falls back to the password.
 * Wrong tries (PIN and password together) reaching IDLE_LOCK_MAX_ATTEMPTS,
 * or "Log out", sign the user out.
 */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Lock } from "lucide-react";

import { IDLE_LOCK_MAX_ATTEMPTS, PIN_LENGTH, PIN_PATTERN, type UnlockMethod } from "../constants";
import CustomButton from "../custom-components/CustomButton";
import CustomInput from "../custom-components/CustomInput";
import { Spinner } from "../custom-components/Loader";
import { auth } from "../firebase/config";
import { forgetUnlockMethod, loadUnlockMethod, verifyPin } from "../utils/pinService";

interface IdleLockScreenProps {
  email: string;
  name: string;
  onUnlock: () => void;
  onLogout: () => void;
}

const triesText = (left: number) => `${left} ${left === 1 ? "try" : "tries"} left before you are logged out.`;

function IdleLockScreen({ email, name, onUnlock, onLogout }: IdleLockScreenProps) {
  const { control, handleSubmit, reset } = useForm<{ password: string; pin: string }>({
    defaultValues: { password: "", pin: "" },
  });
  // null while the method is being found out.
  const [method, setMethod] = useState<UnlockMethod | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadUnlockMethod().then((next) => {
      if (!cancelled) setMethod(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const switchToPassword = (message = "") => {
    reset({ password: "", pin: "" });
    setMethod("password");
    setError(message);
  };

  /** One more wrong try; true when the user was logged out. */
  const wrongTry = () => {
    const tries = attempts + 1;
    setAttempts(tries);
    reset({ password: "", pin: "" });
    if (tries >= IDLE_LOCK_MAX_ATTEMPTS) {
      onLogout();
      return { loggedOut: true, left: 0 };
    }
    return { loggedOut: false, left: IDLE_LOCK_MAX_ATTEMPTS - tries };
  };

  const unlock = handleSubmit(async ({ password, pin }) => {
    const current = auth.currentUser;
    if (!current || !email) {
      onLogout();
      return;
    }
    setChecking(true);
    setError("");

    if (method === "pin") {
      const result = await verifyPin(pin);
      setChecking(false);
      if (result.ok) {
        reset({ password: "", pin: "" });
        onUnlock();
        return;
      }
      if (result.code === "PIN_LOCKED" || result.code === "PIN_NOT_SET") {
        forgetUnlockMethod();
        switchToPassword(result.message);
        return;
      }
      if (result.code === "ERROR") {
        // Server not reachable: not the user's fault, no try counted.
        setError(`${result.message} You can also use your password.`);
        return;
      }
      const { loggedOut, left } = wrongTry();
      if (!loggedOut) setError(`Wrong PIN. ${triesText(left)}`);
      return;
    }

    try {
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(email, password));
      reset({ password: "", pin: "" });
      onUnlock();
    } catch (cause) {
      const code = (cause as { code?: string })?.code ?? "";
      const { loggedOut, left } = wrongTry();
      if (loggedOut) return;
      setError(
        code === "auth/network-request-failed"
          ? "No internet connection. Please try again."
          : code === "auth/too-many-requests"
            ? "Too many tries. Please wait a moment and try again."
            : `Wrong password. ${triesText(left)}`
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
            No activity for 5 minutes. {name ? `${name}, enter` : "Enter"} your{" "}
            {method === "pin" ? "4-digit PIN" : "password"} to continue.
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-gray-700">{email}</p>
        </div>

        {method === null ? (
          <div className="flex justify-center py-3">
            <Spinner size="sm" label="Loading" />
          </div>
        ) : method === "pin" ? (
          <CustomInput
            key="pin"
            control={control}
            name="pin"
            type="password"
            label="PIN"
            inputMode="numeric"
            maxLength={PIN_LENGTH}
            autoComplete="off"
            autoFocus
            className="text-center text-lg tracking-[0.75em]"
            rules={{ required: "Enter your PIN.", pattern: { value: PIN_PATTERN, message: "Enter the 4 digits." } }}
          />
        ) : (
          <CustomInput
            key="password"
            control={control}
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            autoFocus
            rules={{ required: "Enter your password." }}
          />
        )}
        {error && <p className="mt-2 text-sm font-medium text-red-600" role="alert">{error}</p>}

        {/* Unlock + Log out in one row; "Use password instead" on its own row below. */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <CustomButton type="button" variant="outline" onClick={onLogout} disabled={checking}>
            Log out
          </CustomButton>
          <CustomButton type="submit" variant="cves" disabled={checking || method === null}>
            {checking ? "Checking..." : "Unlock"}
          </CustomButton>
        </div>
        {method === "pin" && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => switchToPassword()}
              disabled={checking}
              className="py-1 text-sm font-semibold text-navy underline-offset-2 hover:underline"
            >
              Use password instead
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default IdleLockScreen;
