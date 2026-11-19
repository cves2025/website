import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import { auth } from "../firebase/config";

/**
 * Confirms that `password` belongs to the currently signed-in account by
 * re-authenticating the user against Firebase Auth. This is the standard
 * "enter your password to confirm" gate used before sensitive actions such as
 * deleting the students of a whole class.
 *
 * @param email - the logged-in user's email from the auth context. When it is
 *        missing, the email on the Firebase auth user is used as a fallback.
 * @returns an user-facing error message when the password cannot be verified,
 *          or `null` when the password was accepted.
 */
export async function verifyAccountPassword(
  email: string | null | undefined,
  password: string
): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return "You are not signed in. Please log in again.";
  }

  const accountEmail = email ?? currentUser.email;
  if (!accountEmail) {
    return "Your account has no email on file, so the password cannot be verified.";
  }

  try {
    await reauthenticateWithCredential(
      currentUser,
      EmailAuthProvider.credential(accountEmail, password)
    );
    return null;
  } catch (cause) {
    const code = (cause as { code?: string })?.code ?? "";
    switch (code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect password. Please try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      default:
        return "Password could not be verified. Please try again.";
    }
  }
}

/**
 * Changes the signed-in account password: checks `currentPassword` first
 * (re-authentication, which Firebase also needs before a password change).
 * @returns a user-facing error message, or `null` when the password was changed.
 */
export async function changeAccountPassword(
  email: string | null | undefined,
  currentPassword: string,
  newPassword: string
): Promise<string | null> {
  const wrong = await verifyAccountPassword(email, currentPassword);
  if (wrong) return wrong.replace("Incorrect password", "The current password is wrong");
  const currentUser = auth.currentUser;
  if (!currentUser) return "You are not signed in. Please log in again.";
  try {
    await updatePassword(currentUser, newPassword);
    return null;
  } catch (cause) {
    const code = (cause as { code?: string })?.code ?? "";
    return code === "auth/weak-password"
      ? "The new password is too weak. Use at least 8 characters."
      : "The password could not be changed. Please try again.";
  }
}
