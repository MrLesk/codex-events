import { Outlet, Link, useLocation } from "react-router";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="min-h-screen bg-black text-[#ECECEC] font-sans antialiased flex flex-col selection:bg-white/20">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
