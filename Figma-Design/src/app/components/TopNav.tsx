import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { ChevronDown, Moon, User, Settings, LogOut } from "lucide-react";
import { useAuth, UserRole } from "../AuthContext";

export function TopNav() {
  const { role, setRole } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-[60px] min-h-[60px] flex items-center justify-between px-6 border-b border-white/[0.08] bg-black z-50 sticky top-0">
      <div className="flex items-center gap-12">
        <Link to="/" className="text-[17px] font-semibold tracking-[-0.01em] text-white flex items-center gap-2">
          Codex Hackathons
        </Link>
      </div>
      <div className="flex items-center gap-4 relative">
        <div className="flex items-center border border-white/[0.1] rounded-full overflow-hidden mr-2 bg-[#111111] relative pr-6">
          <span className="px-3 text-[12px] text-[#A3A3A3] border-r border-white/[0.1] py-1.5">Role</span>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="bg-transparent text-[13px] text-white pl-2 pr-6 py-1.5 outline-none focus:ring-0 appearance-none cursor-pointer w-full relative z-10"
          >
            <option value="platform_admin" className="bg-[#111111]">Platform Admin</option>
            <option value="hackathon_admin" className="bg-[#111111]">Hackathon Admin</option>
            <option value="judge" className="bg-[#111111]">Judge</option>
            <option value="participant" className="bg-[#111111]">Participant</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#A3A3A3] z-0">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
        
        <button className="text-[#a3a3a3] hover:text-white transition-colors p-1">
          <Moon className="w-4 h-4" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full bg-[#212121] border border-white/[0.1] flex items-center justify-center text-[#A3A3A3] hover:text-white hover:border-white/[0.2] transition-colors ml-2"
          >
            <User className="w-4 h-4" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#111111] border border-white/[0.08] rounded-xl shadow-xl overflow-hidden py-1 z-50">
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <p className="text-[13px] font-medium text-white">Developer User</p>
                <p className="text-[12px] text-[#8C8C8C] truncate">dev@codexhackathons.com</p>
              </div>
              <div className="py-1">
                <Link 
                  to="/settings" 
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-[#A3A3A3] hover:bg-white/[0.04] hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <button 
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
