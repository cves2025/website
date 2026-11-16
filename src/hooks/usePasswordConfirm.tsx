/**
 * "Enter your password to continue" before a sensitive action (fee
 * structure, permissions, deleting a student or teacher...). The password is
 * checked by Firebase (re-authentication), every time: someone using a
 * computer the admin left open cannot change these without the password.
 *
 *   const { confirmPassword, passwordDialog } = usePasswordConfirm();
 *   if (!(await confirmPassword({ title: "Save Fee Structure" }))) return;
 *   ...and render {passwordDialog} once in the page.
 */
import { useContext, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { myContext } from "../component/context/MyContextProvider";
import { CVES_BUTTON } from "../constants";
import CustomInput from "../custom-components/CustomInput";
import Modal from "../custom-components/Modal";
import { verifyAccountPassword } from "../utils/verifyAccountPassword";

export interface PasswordConfirmOptions {
  /** Dialog title, e.g. "Save Fee Structure". */
  title: string;
  /** What will happen; the password line is added below it. */
  message?: string;
  /** Text of the confirm button (default "Confirm"). */
  confirmText?: string;
}

export function usePasswordConfirm() {
  const { user } = useContext(myContext);
  const [request, setRequest] = useState<PasswordConfirmOptions | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const { control, handleSubmit, reset } = useForm<{ password: string }>({
    defaultValues: { password: "" },
  });

  const finish = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    reset({ password: "" });
    setError("");
    setRequest(null);
  };

  /** Resolves true once the right password is entered, false on Cancel. */
  const confirmPassword = (options: PasswordConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      reset({ password: "" });
      setError("");
      setRequest(options);
    });

  const submit = handleSubmit(async ({ password }) => {
    setChecking(true);
    setError("");
    const message = await verifyAccountPassword(user?.email, password);
    setChecking(false);
    if (message) {
      setError(message);
      reset({ password: "" });
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
        <p className="mb-3 text-sm text-gray-600">
          For safety, enter your account password to continue.
          {user?.email && <span className="mt-1 block truncate text-xs font-semibold text-gray-700">{user.email}</span>}
        </p>
        <CustomInput
          control={control}
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          autoFocus
          rules={{ required: "Enter your password." }}
        />
        {error && (
          <p className="mt-2 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );

  return { confirmPassword, passwordDialog };
}
