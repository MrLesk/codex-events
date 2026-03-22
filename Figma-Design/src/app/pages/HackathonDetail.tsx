import { useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Play, Settings, Search, Filter, MoreHorizontal, User, Users, ClipboardCheck, Award } from "lucide-react";
import { useAuth } from "../AuthContext";

export function HackathonDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  
  // Default tab based on role
  const defaultTab = role === 'judge' ? 'judging' : role === 'participant' ? 'my-team' : 'overview';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Filter tabs based on role
  const getTabs = () => {
    switch(role) {
      case 'platform_admin':
      case 'hackathon_admin':
        return [
          { id: "overview", label: "Overview" },
          { id: "applications", label: "Applications", count: 142 },
          { id: "teams", label: "Teams", count: 48 },
          { id: "submissions", label: "Submissions", count: 12 },
          { id: "judging", label: "Judging" },
          { id: "prizes", label: "Prizes" }
        ];
      case 'judge':
        return [
          { id: "overview", label: "Details" },
          { id: "judging", label: "My Assignments", count: 4 }
        ];
      case 'participant':
        return [
          { id: "overview", label: "Details" },
          { id: "my-team", label: "My Team Workspace" },
          { id: "participants", label: "Participants" }
        ];
      default:
        return [{ id: "overview", label: "Overview" }];
    }
  };

  const tabs = getTabs();

  // Reset tab if it becomes invalid when role changes
  if (!tabs.find(t => t.id === activeTab)) {
    setActiveTab(tabs[0].id);
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header Area */}
      <div className="border-b border-white/[0.08] bg-black/50 backdrop-blur-md sticky top-0 z-40">
        <div className="px-8 py-6 max-w-[1200px] w-full mx-auto">
          <Link to="/hackathons" className="inline-flex items-center gap-1.5 text-[13px] text-[#A3A3A3] hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Hackathons
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-white">Codex AI Spring 2026</h1>
                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium">
                  Submission Open
                </span>
              </div>
              <p className="text-[14px] text-[#A3A3A3]">Mar 1 - Apr 15 • 142 Approved Participants • 48 Teams</p>
            </div>
            
            <div className="flex items-center gap-3">
              {(role === 'platform_admin' || role === 'hackathon_admin') && (
                <>
                  <button className="flex items-center gap-1.5 bg-[#212121] border border-white/[0.08] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:border-white/[0.2] transition-colors">
                    <Settings className="w-4 h-4" /> Configure
                  </button>
                  <button className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#ececec] transition-colors">
                    <Play className="w-4 h-4" /> Start Judging Prep
                  </button>
                </>
              )}
              {role === 'participant' && (
                <button className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#ececec] transition-colors">
                  Submit Project
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 max-w-[1200px] w-full mx-auto flex items-center gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id 
                  ? "border-white text-white" 
                  : "border-transparent text-[#A3A3A3] hover:text-white"
              }`}
            >
              {tab.label}
              {tab.count && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-white/10 text-white" : "bg-white/[0.05] text-[#8c8c8c]"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 py-8 max-w-[1200px] w-full mx-auto flex-1">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "teams" && <TeamsTab />}
        {activeTab === "applications" && <ApplicationsTab />}
        {activeTab === "my-team" && <ParticipantMyTeamTab />}
        {activeTab === "judging" && role === 'judge' && <JudgeAssignmentsTab />}
        
        {/* Placeholder for other tabs */}
        {["submissions", "prizes", "participants"].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center h-[400px] text-[#A3A3A3] border border-dashed border-white/[0.1] rounded-xl">
            <p>This section is under construction.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-6">
          <h3 className="text-[14px] font-medium text-[#A3A3A3] mb-4">Registration Window</h3>
          <div className="text-[16px] text-white">Mar 1, 2026 - Mar 15, 2026</div>
          <div className="mt-4 w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full w-full"></div>
          </div>
          <p className="text-[12px] text-[#8c8c8c] mt-2">Registration closed</p>
        </div>
        
        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-6">
          <h3 className="text-[14px] font-medium text-[#A3A3A3] mb-4">Submission Window</h3>
          <div className="text-[16px] text-white">Mar 15, 2026 - Apr 1, 2026</div>
          <div className="mt-4 w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full w-[40%] relative">
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <p className="text-[12px] text-[#8c8c8c] mt-2">7 days remaining</p>
        </div>

        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-6">
          <h3 className="text-[14px] font-medium text-[#A3A3A3] mb-4">Judging Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-[#8c8c8c]">Format</span>
              <span className="text-white">Blind Evaluation</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#8c8c8c]">Criteria</span>
              <span className="text-white">4 Dimensions</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#8c8c8c]">Assigned Judges</span>
              <span className="text-white">12 Users</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-6">
        <h3 className="text-[16px] font-medium text-white mb-4">About this Hackathon</h3>
        <div className="text-[14px] text-[#A3A3A3] space-y-4 leading-relaxed max-w-[800px]">
          <p>Welcome to the Codex AI Spring 2026 Hackathon! This event is designed to push the boundaries of what's possible with large language models and agentic workflows.</p>
          <p>Participants are expected to build innovative applications that leverage the latest Codex APIs to solve real-world problems. Whether you're automating tedious coding tasks, building intelligent developer tools, or exploring new paradigms of human-computer interaction, we want to see what you can create.</p>
        </div>
      </div>
    </div>
  );
}

function ApplicationsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8c8c]" />
            <input 
              type="text" 
              placeholder="Search applications..." 
              className="pl-9 pr-4 py-2 bg-[#111111] border border-white/[0.08] rounded-lg text-[13px] text-white w-[300px] focus:outline-none focus:border-white/[0.2]"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#111111] border border-white/[0.08] rounded-lg text-[13px] text-[#A3A3A3] hover:border-white/[0.2] transition-colors">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>
      </div>

      <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#111111]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#1A1A1A] text-[#8C8C8C] border-b border-white/[0.08]">
            <tr>
              <th className="px-6 py-3 font-medium">User</th>
              <th className="px-6 py-3 font-medium">Applied Date</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {[
              { name: "John Doe", email: "john@example.com", date: "Mar 10, 2026", status: "Approved" },
              { name: "Alice Smith", email: "alice@example.com", date: "Mar 11, 2026", status: "Pending" },
              { name: "Bob Johnson", email: "bob@example.com", date: "Mar 12, 2026", status: "Approved" },
              { name: "Charlie Brown", email: "charlie@example.com", date: "Mar 12, 2026", status: "Rejected" },
            ].map((app, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-white">{app.name}</div>
                  <div className="text-[#8c8c8c] text-[12px]">{app.email}</div>
                </td>
                <td className="px-6 py-4 text-[#A3A3A3]">{app.date}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    app.status === 'Approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    app.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-[#A3A3A3] hover:text-white transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: "Neural Ninjas", members: 4, status: "Submitted", desc: "Building agentic workflows for code review." },
          { name: "Syntax Squad", members: 2, status: "Working", desc: "Automating frontend development with AI." },
          { name: "Solo Coder", members: 1, status: "Working", desc: "Exploring generative UI components." },
          { name: "Data Drifters", members: 3, status: "Submitted", desc: "Semantic search over personal knowledge bases." },
          { name: "Open Source Heroes", members: 4, status: "Working", desc: "Contributing to the Codex ecosystem." },
        ].map((team, i) => (
          <div key={i} className="bg-[#111111] border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.2] transition-colors cursor-pointer flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-[16px] font-medium text-white">{team.name}</h3>
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                team.status === 'Submitted' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
              }`}>
                {team.status}
              </span>
            </div>
            <p className="text-[13px] text-[#A3A3A3] mb-6 flex-1">{team.desc}</p>
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 mt-auto">
              <div className="flex -space-x-2">
                {[...Array(team.members)].map((_, j) => (
                  <div key={j} className="w-6 h-6 rounded-full bg-[#212121] border border-[#111111] flex items-center justify-center text-[10px] text-[#8c8c8c]">
                    {String.fromCharCode(65 + j)}
                  </div>
                ))}
              </div>
              <div className="text-[12px] text-[#8c8c8c]">{team.members} / 4 members</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JudgeAssignmentsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-[#111111] border border-white/[0.08] rounded-xl p-4">
        <div className="flex gap-8">
          <div>
            <p className="text-[12px] text-[#8c8c8c] mb-1">Total Assigned</p>
            <p className="text-[18px] text-white font-medium">4</p>
          </div>
          <div>
            <p className="text-[12px] text-[#8c8c8c] mb-1">Completed</p>
            <p className="text-[18px] text-white font-medium">1</p>
          </div>
          <div>
            <p className="text-[12px] text-[#8c8c8c] mb-1">Pending</p>
            <p className="text-[18px] text-white font-medium">3</p>
          </div>
        </div>
        <button className="bg-white text-black px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#ececec] transition-colors">
          Continue Judging
        </button>
      </div>

      <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#111111]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#1A1A1A] text-[#8C8C8C] border-b border-white/[0.08]">
            <tr>
              <th className="px-6 py-3 font-medium">Submission ID (Anonymized)</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Score</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {[
              { id: "SUB-8A7F2", status: "Completed", score: "8.5 / 10" },
              { id: "SUB-1B9E4", status: "In Progress", score: "-" },
              { id: "SUB-5C3D1", status: "Pending", score: "-" },
              { id: "SUB-9F2A6", status: "Pending", score: "-" },
            ].map((sub, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 font-mono text-[12px] text-white">{sub.id}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    sub.status === 'Completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    sub.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#A3A3A3]">{sub.score}</td>
                <td className="px-6 py-4 text-right">
                  <button className={`text-[13px] px-3 py-1.5 rounded-lg border transition-colors ${
                    sub.status === 'Completed' 
                      ? 'bg-transparent border-white/[0.1] text-[#8c8c8c] hover:text-white' 
                      : 'bg-white text-black border-transparent hover:bg-white/90 font-medium'
                  }`}>
                    {sub.status === 'Completed' ? 'View/Edit' : 'Evaluate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ParticipantMyTeamTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-[20px] font-semibold text-white mb-1">Neural Ninjas</h2>
              <p className="text-[13px] text-[#A3A3A3]">Building agentic workflows for code review.</p>
            </div>
            <button className="bg-[#212121] border border-white/[0.08] text-white px-3 py-1.5 rounded-lg text-[12px] hover:border-white/[0.2] transition-colors">
              Edit Team Profile
            </button>
          </div>

          <div className="border border-white/[0.08] rounded-xl p-5 bg-[#1A1A1A] mb-6">
            <h3 className="text-[14px] font-medium text-white mb-4">Project Submission</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-[#8c8c8c] mb-1">Project Name</label>
                <div className="text-[14px] text-white">AutoReviewer AI</div>
              </div>
              <div>
                <label className="block text-[12px] text-[#8c8c8c] mb-1">Repository URL</label>
                <a href="#" className="text-[14px] text-blue-400 hover:underline">github.com/neural-ninjas/autoreviewer</a>
              </div>
              <div>
                <label className="block text-[12px] text-[#8c8c8c] mb-1">Demo Video URL</label>
                <a href="#" className="text-[14px] text-blue-400 hover:underline">youtube.com/watch?v=demo</a>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-white/[0.08] flex justify-end">
              <button className="bg-white text-black px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-white/90 transition-colors">
                Update Submission
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-6">
          <h3 className="text-[14px] font-medium text-white mb-4">Team Members (4/4)</h3>
          <div className="space-y-4">
            {[
              { name: "You (Developer)", role: "Team Admin", initials: "D" },
              { name: "Sarah Connor", role: "Member", initials: "S" },
              { name: "Kyle Reese", role: "Member", initials: "K" },
              { name: "Miles Dyson", role: "Member", initials: "M" },
            ].map((member, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#212121] flex items-center justify-center text-[12px] text-white border border-white/[0.05]">
                    {member.initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white">{member.name}</p>
                    <p className="text-[11px] text-[#8c8c8c]">{member.role}</p>
                  </div>
                </div>
                {i === 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-medium text-[#A3A3A3] bg-white/[0.05] px-2 py-0.5 rounded">Admin</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
