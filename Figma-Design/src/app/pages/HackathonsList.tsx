import { useState } from "react";
import { Link } from "react-router";
import { Search, ChevronDown, ArrowUpRight } from "lucide-react";
import { useAuth } from "../AuthContext";

const mockHackathons = [
  {
    id: "codex-spring-26",
    title: "Codex AI Spring 2026",
    status: "Active",
    dateLabel: "Mar 1 - Apr 15",
    location: "Global / Online",
    hostedBy: "OpenAI DevRel",
    image: "https://images.unsplash.com/photo-1660165458059-57cfb6cc87e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    tags: ["AI", "Agents", "Open Source"]
  },
  {
    id: "security-challenge",
    title: "Global Security Challenge",
    status: "Active",
    dateLabel: "Feb 10 - Mar 20",
    location: "San Francisco, CA",
    hostedBy: "Security Alliance",
    image: "https://images.unsplash.com/photo-1773349807434-374473797148?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    tags: ["Security", "Red Teaming"]
  },
  {
    id: "enterprise-automation",
    title: "Enterprise Automation",
    status: "Upcoming",
    dateLabel: "Mar 15 - May 1",
    location: "London, UK",
    hostedBy: "Enterprise Co",
    image: "https://images.unsplash.com/photo-1759884247144-53d52c31f859?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    tags: ["Enterprise", "B2B"]
  }
];

export function HackathonsList() {
  const [activeTab, setActiveTab] = useState("all");
  const { role } = useAuth();

  const getActionText = (hackathonStatus: string) => {
    if (role === 'platform_admin' || role === 'hackathon_admin') return 'Manage';
    if (role === 'judge') return 'View Assignments';
    if (role === 'participant') {
      if (hackathonStatus === 'Active') return 'Go to Workspace';
      return 'Apply Now';
    }
    return 'View Details';
  };

  return (
    <div className="flex flex-col min-h-full pb-16">
      <div className="px-8 pt-8 max-w-[1000px] w-full mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Hackathons</h1>
          {(role === 'platform_admin' || role === 'hackathon_admin') && (
            <Link to="/create" className="bg-white text-black px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-white/90 transition-colors">
              Create New
            </Link>
          )}
        </div>
        
        <p className="text-[#A3A3A3] text-[15px] mb-8">
          {role === 'participant' ? 'Discover and join upcoming hackathon programs.' : 
           role === 'judge' ? 'Programs you are assigned to evaluate.' : 
           'Manage and track all hackathon programs and their lifecycles.'}
        </p>

        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-2 mb-12 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 text-[13px] rounded-lg transition-colors ${activeTab === 'all' ? 'bg-white text-black font-medium' : 'text-[#A3A3A3] hover:text-white'}`}
            >
              All
            </button>
            <button 
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 text-[13px] rounded-lg transition-colors ${activeTab === 'active' ? 'bg-white text-black font-medium' : 'text-[#A3A3A3] hover:text-white'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`px-4 py-1.5 text-[13px] rounded-lg transition-colors ${activeTab === 'past' ? 'bg-white text-black font-medium' : 'text-[#A3A3A3] hover:text-white'}`}
            >
              Past
            </button>
            <span className="text-[#8c8c8c] text-[13px] ml-4 pl-4 border-l border-white/[0.08]">
              {mockHackathons.length} hackathons
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#212121] border border-white/[0.08] rounded-lg text-[13px] text-[#A3A3A3] hover:border-white/[0.2] transition-colors">
              Status <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#212121] border border-white/[0.08] rounded-lg text-[13px] text-[#A3A3A3] hover:border-white/[0.2] transition-colors">
              Date <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-16">
          {mockHackathons.map((hackathon) => (
            <div key={hackathon.id} className="relative">
              <div className="absolute -left-8 top-0 bottom-0 w-px bg-white/[0.08]"></div>
              <div className="absolute -left-[35px] top-6 w-2 h-2 rounded-full bg-[#8c8c8c] border-2 border-black"></div>
              
              <div className="text-[11px] font-bold tracking-widest text-[#8c8c8c] absolute -left-28 top-5 uppercase">
                {hackathon.status}
              </div>

              <Link to={`/hackathons/${hackathon.id}`} className="block group">
                <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden group-hover:border-white/[0.2] transition-colors">
                  <div className="h-[240px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                    <img 
                      src={hackathon.image} 
                      alt={hackathon.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute bottom-6 left-6 z-20">
                      <div className="flex gap-2 mb-3">
                        {hackathon.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded text-[11px] font-medium text-white/90">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h2 className="text-[28px] font-semibold text-white tracking-[-0.01em]">{hackathon.title}</h2>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium text-white mb-1">{hackathon.dateLabel}</p>
                      <p className="text-[13px] text-[#A3A3A3]">Hosted by {hackathon.hostedBy} • {hackathon.location}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button className="bg-white text-black px-4 py-2 rounded-full text-[13px] font-medium hover:bg-[#ececec] transition-colors flex items-center gap-1.5">
                        {getActionText(hackathon.status)} <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
