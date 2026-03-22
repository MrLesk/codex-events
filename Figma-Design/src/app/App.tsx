import { RouterProvider } from "react-router";
import { router } from "./routes";
import { useEffect } from "react";
import { AuthProvider } from "./AuthContext";

export default function App() {
  // Apply the dark theme globally since the design strictly uses it.
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#000000";
    document.body.style.color = "#ffffff";
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
