import { Link, useLocation } from "react-router";
import { useAuth } from "../AuthContext";

export function Sidebar() {
  const location = useLocation();
  const { role } = useAuth();

  const isCurrent = (path: string) => location.pathname === path;

  const NavGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-[12px] font-semibold text-[#8C8C8C] mb-2 px-3 tracking-[0.02em] uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-0.5">
        {children}
      </div>
    </div>
  );

  const NavItem = ({ href, label, active }: { href: string; label: string; active?: boolean }) => {
    return (
      <Link
        to={href}
        className={`px-3 py-[5px] text-[14px] rounded-md transition-colors ${
          active ? "bg-[#282828] text-white" : "text-[#ECECEC] hover:bg-[#1A1A1A] hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <aside className="w-[260px] min-w-[260px] border-r border-white/[0.08] bg-black h-[calc(100vh-60px)] flex flex-col pt-4 overflow-y-auto hidden md:flex pb-6">
      <nav className="flex-1 px-4 text-[#A3A3A3]">
        {role === 'platform_admin' && (
          <>
            <NavGroup title="Platform">
              <NavItem href="/dashboard" label="Overview" active={isCurrent("/dashboard")} />
              <NavItem href="/hackathons" label="All Hackathons" active={location.pathname.startsWith("/hackathons")} />
              <NavItem href="/create" label="Create Hackathon" active={isCurrent("/create")} />
            </NavGroup>
            <NavGroup title="Platform Settings">
              <NavItem href="/platform-docs" label="Platform Documents" active={isCurrent("/platform-docs")} />
              <NavItem href="/users" label="All Users" active={isCurrent("/users")} />
              <NavItem href="/audit-log" label="Audit Log" active={isCurrent("/audit-log")} />
            </NavGroup>
          </>
        )}

        {role === 'hackathon_admin' && (
          <>
            <NavGroup title="My Hackathons">
              <NavItem href="/dashboard" label="Dashboard" active={isCurrent("/dashboard")} />
              <NavItem href="/hackathons" label="All Programs" active={location.pathname.startsWith("/hackathons")} />
            </NavGroup>
            <NavGroup title="Active Program">
              <NavItem href="/hackathons/codex-spring-26" label="Codex AI Spring" active={location.pathname === "/hackathons/codex-spring-26"} />
              <NavItem href="/applications" label="Applications" active={isCurrent("/applications")} />
              <NavItem href="/teams" label="Teams" active={isCurrent("/teams")} />
              <NavItem href="/submissions" label="Submissions" active={isCurrent("/submissions")} />
              <NavItem href="/judging" label="Judging Prep" active={isCurrent("/judging")} />
            </NavGroup>
          </>
        )}

        {role === 'judge' && (
          <>
            <NavGroup title="Judging">
              <NavItem href="/dashboard" label="Dashboard" active={isCurrent("/dashboard")} />
              <NavItem href="/assignments" label="My Assignments" active={isCurrent("/assignments")} />
            </NavGroup>
            <NavGroup title="Hackathons">
              <NavItem href="/hackathons/codex-spring-26" label="Codex AI Spring" active={location.pathname === "/hackathons/codex-spring-26"} />
            </NavGroup>
          </>
        )}

        {role === 'participant' && (
          <>
            <NavGroup title="My Portal">
              <NavItem href="/dashboard" label="Dashboard" active={isCurrent("/dashboard")} />
              <NavItem href="/my-applications" label="My Applications" active={isCurrent("/my-applications")} />
              <NavItem href="/my-teams" label="My Teams" active={isCurrent("/my-teams")} />
            </NavGroup>
            <NavGroup title="Explore">
              <NavItem href="/hackathons" label="All Hackathons" active={location.pathname.startsWith("/hackathons")} />
            </NavGroup>
          </>
        )}
      </nav>
    </aside>
  );
}
