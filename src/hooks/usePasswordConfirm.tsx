/**
 * "Enter your password (or PIN) to continue" before a sensitive action (fee
 * structure, permissions, deleting a student or teacher...). Checked every
 * time: someone using a computer the admin left open cannot change these.
 *
 * - Password: checked by Firebase (re-authentication).
 * - PIN: when Settings > Lock & PIN says PIN and the user has one; checked
 *   by the server. "Use password instead" is always offered; a PIN locked
 *   after wrong tries falls back to the password.
 * - `passwordOnly` (e.g. changing the PIN) always asks for the password.
 *
 *   const { confirmPassword, passwordDialog } = usePasswordConfirm();
 *   if (!(await confirmPassword({ title: "Save Fee Structure" }))) return;
 *   ...and render {passwordDialog} once in the page.
 */
import { useContext, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { myContext } from "../component/context/MyContextProvider";
import { CVES_BUTTON, PIN_LENGTH, PIN_PATTERN, type UnlockMethod } from "../constants";
import CustomInput from "../custom-components/CustomInput";
import Modal from "../custom-components/Modal";
import { Spinner } from "../custom-components/Loader";
import { forgetUnlockMethod, loadUnlockMethod, verifyPin } from "../utils/pinService";
import { verifyAccountPassword } from "../utils/verifyAccountPassword";

export interface PasswordConfirmOptions {
  /** Dialog title, e.g. "Save Fee Structure". */
  title: string;
  /** What will happen; the password line is added below it. */
  message?: string;
  /** Text of the confirm button (default "Confirm"). */
  confirmText?: string;
  /** Always ask for the account password, never the PIN. */
  passwordOnly?: boolean;
}

export function usePasswordConfirm() {
  const { user } = useContext(myContext);
  const [request, setRequest] = useState<PasswordConfirmOptions | null>(null);
  // null while the method is being found out.
  const [method, setMethod] = useState<UnlockMethod | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const { control, handleSubmit, reset } = useForm<{ password: string; pin: string }>({
    defaultValues: { password: "", pin: "" },
  });

  const finish = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    reset({ password: "", pin: "" });
    setError("");
    setRequest(null);
  };

  const switchToPassword = (message = "") => {
    reset({ password: "", pin: "" });
    setMethod("password");
    setError(message);
  };

  /** Resolves true once the right password / PIN is entered, false on Cancel. */
  const confirmPassword = (options: PasswordConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      reset({ password: "", pin: "" });
      setError("");
      setRequest(options);
      if (options.passwordOnly) {
        setMethod("password");
        return;
      }
      setMethod(null);
      void loadUnlockMethod().then((next) => {
        if (resolveRef.current === resolve) setMethod(next);
      });
    });

  const submit = handleSubmit(async ({ password, pin }) => {
    setChecking(true);
    setError("");
    if (method === "pin") {
      const result = await verifyPin(pin);
      setChecking(false);
      if (result.ok) {
        finish(true);
        return;
      }
      if (result.code === "PIN_LOCKED" || result.code === "PIN_NOT_SET") {
        forgetUnlockMethod();
        switchToPassword(result.message);
        return;
      }
      reset({ password: "", pin: "" });
      setError(
        result.code === "WRONG_PIN" && result.triesLeft !== undefined
          ? `Wrong PIN. ${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left, then use your password.`
          : result.message
      );
      return;
    }
    const message = await verifyAccountPassword(user?.email, password);
    setChecking(false);
    if (message) {
      setError(message);
      reset({ password: "", pin: "" });
      return;
    }
    finish(true);
  });

  const passwordDialog = (
    <Modal
      isOpen={request !== null}
      onClose={() => finish(false)}
      title={request?.title ?? ""}
      submitText={checking ? "Checking..." : request?.confirmText ?? "Confirm"}
      onSubmit={() => void submit()}
      loading={checking}
      submitDisabled={method === null}
      submitClassName={CVES_BUTTON}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        noValidate
      >
        {request?.message && <p className="mb-2 text-sm text-gray-600">{request.message}</p>}
        {method === null ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" label="Loading" />
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-600">
              For safety, enter your {method === "pin" ? "4-digit PIN" : "account password"} to continue.
              {user?.email && <span className="mt-1 block truncate text-xs font-semibold text-gray-700">{user.email}</span>}
            </p>
            {method === "pin" ? (
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
                className="tracking-[0.5em]"
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
            {error && (
              <p className="mt-2 text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            )}
            {method === "pin" && (
              <button
                type="button"
                onClick={() => switchToPassword()}
                className="mt-3 text-sm font-semibold text-navy underline-offset-2 hover:underline"
              >
                Use password instead
              </button>
            )}
          </>
        )}
      </form>
    </Modal>
  );

  return { confirmPassword, passwordDialog };
}
