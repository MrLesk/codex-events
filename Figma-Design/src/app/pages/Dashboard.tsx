import { Link } from "react-router";
import { ArrowRight, Trophy, Users, FileCode2, Award, ClipboardCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "../AuthContext";

export function Dashboard() {
  const { role } = useAuth();

  return (
    <div className="flex flex-col min-h-full pb-16">
      <div className="px-8 pt-8 max-w-[1200px] w-full mx-auto">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] mb-8">Dashboard</h1>

        {role === 'platform_admin' && <PlatformAdminView />}
        {role === 'hackathon_admin' && <HackathonAdminView />}
        {role === 'judge' && <JudgeView />}
        {role === 'participant' && <ParticipantView />}

      </div>
    </div>
  );
}

function PlatformAdminView() {
  return (
    <>
      <div className="bg-gradient-to-r from-[#2B1B19] to-[#1C161D] rounded-xl border border-white/[0.08] p-6 mb-8 relative overflow-hidden flex items-center justify-between group cursor-pointer hover:border-white/[0.15] transition-colors">
        <div className="z-10">
          <h2 className="text-[16px] font-semibold text-white mb-1.5">Launch a new Hackathon with Codex</h2>
          <p className="text-[14px] text-[#A3A3A3] max-w-[500px]">
            Set up registration windows, define evaluation criteria, and manage teams all in one place. Perfect for internal team building or global community events.
          </p>
          <div className="flex gap-3 mt-4">
            <Link to="/create" className="bg-white text-black px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-white/90 transition-colors">
              Get started
            </Link>
            <button className="bg-transparent border border-white/[0.2] text-white px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-white/[0.05] transition-colors">
              Read the docs
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent to-[#E2A281]/20 pointer-events-none" />
      </div>

      <h3 className="text-[18px] font-semibold mb-4">Platform Overview</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-white/[0.08] border border-white/[0.08] rounded-xl overflow-hidden mb-8">
        <StatCard icon={<Trophy className="w-3.5 h-3.5"/>} label="Active Hackathons" value="4" />
        <StatCard icon={<Users className="w-3.5 h-3.5"/>} label="Total Participants" value="1,204" />
        <StatCard icon={<FileCode2 className="w-3.5 h-3.5"/>} label="Submissions" value="342" />
        <StatCard icon={<Award className="w-3.5 h-3.5"/>} label="Prizes Awarded" value="$45,000" />
      </div>

      <RecentHackathons />
    </>
  );
}

function HackathonAdminView() {
  return (
    <>
      <h3 className="text-[18px] font-semibold mb-4">Your Active Programs</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <HackathonCard 
          id="codex-spring-26"
          title="Codex AI Spring 2026"
          description="Build the next generation of AI applications using our latest Codex models."
          status="submission"
          dates="Mar 1 - Apr 15"
          action="Manage Program"
        />
        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-5 flex flex-col justify-center items-center h-[200px] border-dashed text-[#8c8c8c] hover:text-white hover:border-white/[0.2] transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-[#212121] flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <p className="text-[14px] font-medium">Draft New Program</p>
        </div>
      </div>

      <h3 className="text-[18px] font-semibold mb-4">Pending Actions</h3>
      <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-white">42 Pending Applications</p>
                <p className="text-[13px] text-[#8c8c8c]">Codex AI Spring 2026</p>
              </div>
            </div>
            <button className="text-[13px] text-white bg-[#212121] border border-white/[0.1] px-3 py-1.5 rounded-lg hover:bg-[#282828]">Review</button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-white">Finalize Evaluation Criteria</p>
                <p className="text-[13px] text-[#8c8c8c]">Codex AI Spring 2026</p>
              </div>
            </div>
            <button className="text-[13px] text-white bg-[#212121] border border-white/[0.1] px-3 py-1.5 rounded-lg hover:bg-[#282828]">Edit</button>
          </div>
        </div>
      </div>
    </>
  );
}

function JudgeView() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.08] border border-white/[0.08] rounded-xl overflow-hidden mb-8">
        <StatCard icon={<ClipboardCheck className="w-3.5 h-3.5"/>} label="Assigned Submissions" value="15" />
        <StatCard icon={<CheckCircle2 className="w-3.5 h-3.5"/>} label="Completed Reviews" value="4" />
        <StatCard icon={<Sparkles className="w-3.5 h-3.5"/>} label="Avg Score Given" value="7.2 / 10" />
      </div>

      <h3 className="text-[18px] font-semibold mb-4">Your Assignments</h3>
      <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#1A1A1A] text-[#8C8C8C] border-b border-white/[0.08]">
            <tr>
              <th className="px-6 py-3 font-medium">Submission ID</th>
              <th className="px-6 py-3 font-medium">Hackathon</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {[
              { id: "SUB-001", hackathon: "Global Security Challenge", status: "Completed" },
              { id: "SUB-042", hackathon: "Global Security Challenge", status: "In Progress" },
              { id: "SUB-088", hackathon: "Global Security Challenge", status: "Pending" },
              { id: "SUB-102", hackathon: "Global Security Challenge", status: "Pending" },
            ].map((sub, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 font-mono text-[12px] text-white">{sub.id}</td>
                <td className="px-6 py-4 text-[#A3A3A3]">{sub.hackathon}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    sub.status === 'Completed' ? 'bg-green-500/10 text-green-400' :
                    sub.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className={`text-[13px] px-3 py-1.5 rounded-lg border transition-colors ${
                    sub.status === 'Completed' 
                      ? 'bg-transparent border-white/[0.1] text-[#8c8c8c] hover:text-white' 
                      : 'bg-white text-black border-transparent hover:bg-white/90 font-medium'
                  }`}>
                    {sub.status === 'Completed' ? 'View' : 'Evaluate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ParticipantView() {
  return (
    <>
      <div className="bg-gradient-to-r from-[#171A21] to-[#111111] rounded-xl border border-white/[0.08] p-6 mb-8 relative overflow-hidden">
        <h2 className="text-[18px] font-semibold text-white mb-2">Welcome back, Developer</h2>
        <p className="text-[14px] text-[#A3A3A3] mb-6 max-w-[600px]">
          You have 1 active application and you are part of Team "Neural Ninjas" for the Codex AI Spring 2026 hackathon. The submission deadline is in 7 days.
        </p>
        <button className="bg-white text-black px-4 py-2 rounded-full text-[13px] font-medium hover:bg-white/90 transition-colors">
          Go to Team Workspace
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-semibold">Recommended for You</h3>
        <Link to="/hackathons" className="text-[13px] text-[#A3A3A3] hover:text-white transition-colors">
          Browse all
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HackathonCard 
          id="enterprise-automation"
          title="Enterprise Automation"
          description="Streamline workflows with autonomous agents."
          status="registration"
          dates="Mar 15 - May 1"
          action="Apply Now"
        />
        <HackathonCard 
          id="web3-ai"
          title="Summer Web3 & AI"
          description="Exploring the intersection of decentralized protocols."
          status="upcoming"
          dates="Jun 1 - Jul 15"
          action="View Details"
        />
      </div>
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-[#111111] p-5 flex flex-col justify-between hover:bg-[#171717] transition-colors cursor-pointer group">
      <div className="flex items-center justify-between text-[#8c8c8c] mb-8">
        <span className="text-[13px] flex items-center gap-1.5">{icon} {label}</span>
        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div>
        <div className="text-[24px] text-white font-medium">{value}</div>
      </div>
    </div>
  )
}

function RecentHackathons() {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-semibold">Recent Hackathons</h3>
        <Link to="/hackathons" className="text-[13px] text-[#A3A3A3] hover:text-white transition-colors">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HackathonCard id="codex-spring-26" title="Codex AI Spring 2026" description="Build the next generation of AI applications using our latest Codex models." status="registration" dates="Mar 1 - Apr 15" />
        <HackathonCard id="security-challenge" title="Global Security Challenge" description="Finding vulnerabilities and building robust defenses for AI systems." status="judging" dates="Feb 10 - Mar 20" />
        <HackathonCard id="enterprise-automation" title="Enterprise Automation" description="Streamline workflows with autonomous agents." status="submission" dates="Mar 15 - May 1" />
        <HackathonCard id="winter-web3" title="Winter Web3 & AI" description="Exploring the intersection of decentralized protocols and LLMs." status="completed" dates="Jan 5 - Feb 5" />
      </div>
    </>
  )
}

function HackathonCard({ id, title, description, status, dates, action }: { id: string, title: string, description: string, status: string, dates: string, action?: string }) {
  const getStatusColor = (s: string) => {
    switch(s) {
      case 'registration': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'submission': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'judging': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <Link to={`/hackathons/${id}`} className="block group">
      <div className="bg-[#111111] border border-white/[0.08] group-hover:border-white/[0.2] transition-colors rounded-xl p-5 flex flex-col h-[200px]">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-[#212121] rounded-lg border border-white/[0.08] flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-3a2 2 0 0 1-2-2V2"/><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/><path d="M3 15h6"/><path d="M3 18h6"/></svg>
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-medium ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
        <h4 className="text-[15px] font-medium text-white mb-1">{title}</h4>
        <p className="text-[13px] text-[#A3A3A3] line-clamp-2 leading-relaxed flex-1">{description}</p>
        <div className="text-[12px] text-[#8c8c8c] mt-4 pt-4 border-t border-white/[0.08] flex items-center justify-between">
          <span>{dates}</span>
          {action ? (
            <span className="text-white font-medium group-hover:underline">{action}</span>
          ) : (
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          )}
        </div>
      </div>
    </Link>
  );
}
