import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { HackathonsList } from "./pages/HackathonsList";
import { HackathonDetail } from "./pages/HackathonDetail";
import { UserSettings } from "./pages/UserSettings";
import { CreateHackathon } from "./pages/CreateHackathon";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: Dashboard },
      { path: "hackathons", Component: HackathonsList },
      { path: "hackathons/:id", Component: HackathonDetail },
      { path: "settings", Component: UserSettings },
      { path: "create", Component: CreateHackathon },
      // Fallback
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
