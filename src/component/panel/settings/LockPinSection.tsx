/**
 * Settings > Lock & PIN (admin). Two checkboxes, Password or PIN: the ticked
 * one is what the lock screen and the "confirm before a sensitive action"
 * dialogs ask for, and only its form is shown:
 * - Password: change the account password (current + new + confirm).
 * - PIN: set / change the 4-digit PIN (saved on the server, only a hash;
 *   nobody can see it afterwards).
 * Switching asks for the password first; PIN can be switched on only once a
 * PIN is set (setting the first PIN while PIN is ticked switches it on).
 */
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { KeyRound, LockKeyhole } from "lucide-react";

import {
  ACCOUNT_PASSWORD_MIN,
  CVES_BUTTON,
  PIN_LENGTH,
  PIN_PATTERN,
  UNLOCK_METHOD_OPTIONS,
  WEAK_PINS,
  type UnlockMethod,
} from "../../../constants";
import CircleCheckbox from "../../../custom-components/CircleCheckbox";
import CustomInput from "../../../custom-components/CustomInput";
import Loader, { Spinner } from "../../../custom-components/Loader";
import useLockSettings from "../../../hooks/useLockSettings";
import { usePasswordConfirm } from "../../../hooks/usePasswordConfirm";
import { savePin, saveUnlockSetting } from "../../../utils/pinService";
import { changeAccountPassword } from "../../../utils/verifyAccountPassword";
import { myContext } from "../../context/MyContextProvider";

const dateText = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function SubmitButton({ disabled, busy, children }: { disabled: boolean; busy: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={disabled || busy}
      className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${CVES_BUTTON}`}
    >
      {busy && <Spinner size="xs" tone="white" />}
      {children}
    </button>
  );
}

function LockPinSection() {
  const { user } = useContext(myContext);
  const { settings, setSettings, loading, error, reload } = useLockSettings();
  const { confirmPassword, passwordDialog } = usePasswordConfirm();
  // The ticked box (what is shown); settings.method is what is saved.
  const [chosen, setChosen] = useState<UnlockMethod>("password");
  const [switching, setSwitching] = useState(false);

  const passwordForm = useForm<{ current: string; next: string; confirm: string }>({
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const pinForm = useForm<{ pin: string; confirmPin: string }>({ defaultValues: { pin: "", confirmPin: "" } });

  useEffect(() => {
    if (!loading) setChosen(settings.method);
  }, [loading, settings.method]);

  const pinSet = settings.pin?.set === true;
  const serverDown = !loading && settings.pin === null;

  /** Saves the unlock method (after the password); false when cancelled or failed. */
  const saveMethod = async (method: UnlockMethod) => {
    if (!(await confirmPassword({ title: `Unlock with ${method === "pin" ? "PIN" : "password"}`, passwordOnly: true }))) {
      return false;
    }
    try {
      await saveUnlockSetting(method, user?.uid ?? "");
      setSettings((current) => ({ ...current, method }));
      toast.success(method === "pin" ? "The panel now asks for the PIN." : "The panel now asks for the password.");
      return true;
    } catch (cause) {
      console.error("Unlock method could not be saved.", cause);
      toast.error("The setting could not be saved.");
      return false;
    }
  };

  const tick = async (method: UnlockMethod) => {
    if (method === chosen || switching) return;
    setChosen(method);
    // PIN without a PIN yet: only show the PIN form; saving the PIN switches it on.
    if (method === "pin" && !pinSet) return;
    if (method === settings.method) return;
    setSwitching(true);
    const saved = await saveMethod(method);
    setSwitching(false);
    if (!saved) setChosen(settings.method);
  };

  const savePasswordForm = passwordForm.handleSubmit(async ({ current, next }) => {
    const message = await changeAccountPassword(user?.email, current, next);
    if (message) {
      toast.error(message);
      passwordForm.resetField("current");
      return;
    }
    passwordForm.reset({ current: "", next: "", confirm: "" });
    toast.success("Password changed.");
  });

  const savePinForm = pinForm.handleSubmit(async ({ pin }) => {
    if (!(await confirmPassword({ title: pinSet ? "Change PIN" : "Set PIN", passwordOnly: true }))) return;
    try {
      await savePin(pin);
      pinForm.reset({ pin: "", confirmPin: "" });
      toast.success("PIN saved.");
      // The first PIN, with PIN ticked: the panel now asks for it.
      if (settings.method !== "pin") {
        await saveUnlockSetting("pin", user?.uid ?? "");
        setSettings((current) => ({ ...current, method: "pin" }));
        toast.success("The panel now asks for the PIN.");
      }
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "The PIN could not be saved.");
    }
  });

  const pinRules = {
    required: "Enter 4 digits.",
    pattern: { value: PIN_PATTERN, message: "The PIN must be exactly 4 digits." },
    validate: (value: string) => !WEAK_PINS.includes(value) || "Too easy to guess. Choose another PIN.",
  };

  const savedLabel = UNLOCK_METHOD_OPTIONS.find((option) => option.value === settings.method)?.label ?? "Password";

  return (
    <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-gray-800">Lock &amp; PIN</h2>
      <p className="mt-0.5 text-sm text-gray-500">
        What the panel asks for after 5 minutes without activity, and before sensitive actions (fees, deleting,
        permissions). Tick one; its settings are shown below.
      </p>

      {loading ? (
        <Loader fullScreen={false} label="Loading lock settings..." />
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {UNLOCK_METHOD_OPTIONS.map((option) => (
              <CircleCheckbox
                key={option.value}
                id={`unlock-${option.value}`}
                label={`${option.label} (${option.hint})`}
                checked={chosen === option.value}
                disabled={switching}
                onCheckedChange={(checked) => {
                  if (checked) void tick(option.value);
                }}
                className="font-semibold"
              />
            ))}
            <span className="text-xs text-gray-500 sm:ml-auto">
              Asked now: <b className="text-gray-700">{savedLabel}</b>
              {switching && <Spinner size="xs" label="" />}
            </span>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}

          {chosen === "password" ? (
            <form
              onSubmit={(event) => void savePasswordForm(event)}
              className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4"
              noValidate
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <LockKeyhole className="h-4 w-4 text-navy" />
                Change my password
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <CustomInput
                  control={passwordForm.control}
                  name="current"
                  type="password"
                  label="Current password"
                  autoComplete="current-password"
                  rules={{ required: "Enter your current password." }}
                />
                <CustomInput
                  control={passwordForm.control}
                  name="next"
                  type="password"
                  label="New password"
                  autoComplete="new-password"
                  rules={{
                    required: "Enter a new password.",
                    minLength: { value: ACCOUNT_PASSWORD_MIN, message: `At least ${ACCOUNT_PASSWORD_MIN} characters.` },
                  }}
                />
                <CustomInput
                  control={passwordForm.control}
                  name="confirm"
                  type="password"
                  label="Confirm new password"
                  autoComplete="new-password"
                  rules={{
                    required: "Enter the new password again.",
                    validate: (value: string) => value === passwordForm.getValues("next") || "The passwords do not match.",
                  }}
                />
              </div>
              <div className="flex justify-end">
                <SubmitButton disabled={!passwordForm.formState.isDirty} busy={passwordForm.formState.isSubmitting}>
                  Change Password
                </SubmitButton>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(event) => void savePinForm(event)}
              className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4"
              noValidate
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <KeyRound className="h-4 w-4 text-navy" />
                My PIN
                <span className={`ml-auto text-xs font-semibold ${pinSet ? "text-green-700" : "text-amber-700"}`}>
                  {serverDown
                    ? "Server not reachable"
                    : pinSet
                      ? `Set${settings.pin?.updatedAt ? ` on ${dateText(settings.pin.updatedAt)}` : ""}`
                      : "Not set yet: set it to switch PIN on"}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <CustomInput
                  control={pinForm.control}
                  name="pin"
                  type="password"
                  label={pinSet ? "New PIN" : "PIN"}
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                  autoComplete="new-password"
                  className="tracking-[0.5em]"
                  rules={pinRules}
                />
                <CustomInput
                  control={pinForm.control}
                  name="confirmPin"
                  type="password"
                  label="Confirm PIN"
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                  autoComplete="new-password"
                  className="tracking-[0.5em]"
                  rules={{
                    required: "Enter the PIN again.",
                    validate: (value: string) => value === pinForm.getValues("pin") || "The PINs do not match.",
                  }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Nobody can see a PIN after it is saved; a forgotten PIN is simply set again here. The password
                always works too ("Use password instead").
              </p>
              <div className="flex justify-end">
                <SubmitButton disabled={!pinForm.formState.isDirty || serverDown} busy={pinForm.formState.isSubmitting}>
                  {pinSet ? "Change PIN" : "Set PIN"}
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      )}
      {passwordDialog}
    </div>
  );
}

export default LockPinSection;
