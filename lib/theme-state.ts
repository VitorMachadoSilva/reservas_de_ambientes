import { cookies } from "next/headers";

export const themeStateCookie = "reservation-theme";

export type ThemeState = "light" | "dark";

export async function getInitialTheme() {
  const theme = (await cookies()).get(themeStateCookie)?.value;
  return theme === "dark" ? "dark" : "light";
}
