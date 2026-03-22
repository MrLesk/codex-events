import { useState } from "react";
import { User, Mail, ShieldAlert, AlertTriangle, Github, Linkedin, Globe } from "lucide-react";

export function UserSettings() {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="flex flex-col min-h-full pb-16">
      <div className="px-8 pt-8 max-w-[800px] w-full mx-auto">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] mb-8">User Settings</h1>

        <div className="space-y-8">
          {/* Profile Information */}
          <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#1A1A1A]">
              <h2 className="text-[16px] font-medium text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#8c8c8c]" />
                Profile Information
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-6 pb-6 border-b border-white/[0.08]">
                <div className="w-20 h-20 rounded-full bg-[#212121] border border-white/[0.1] flex items-center justify-center text-[#8c8c8c]">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <button className="bg-white text-black px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-white/90 transition-colors mb-2">
                    Upload Avatar
                  </button>
                  <p className="text-[12px] text-[#8c8c8c]">JPEG, PNG, GIF up to 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] text-[#8c8c8c]">Full Name</label>
                  <input 
                    type="text" 
                    defaultValue="Developer User"
                    className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] text-[#8c8c8c]">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8c8c]" />
                    <input 
                      type="email" 
                      defaultValue="dev@codexhackathons.com"
                      className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">Bio</label>
                <textarea 
                  rows={3}
                  placeholder="Tell us about yourself..."
                  defaultValue="Full-stack developer interested in AI, agents, and tooling."
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button className="bg-white text-black px-5 py-2 rounded-lg text-[13px] font-medium hover:bg-white/90 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#1A1A1A]">
              <h2 className="text-[16px] font-medium text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#8c8c8c]" />
                Social Profiles
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">GitHub Profile</label>
                <div className="relative">
                  <Github className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8c8c]" />
                  <input 
                    type="url" 
                    placeholder="https://github.com/username"
                    className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">LinkedIn Profile</label>
                <div className="relative">
                  <Linkedin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8c8c]" />
                  <input 
                    type="url" 
                    placeholder="https://linkedin.com/in/username"
                    className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button className="bg-[#212121] border border-white/[0.1] text-white px-5 py-2 rounded-lg text-[13px] font-medium hover:border-white/[0.2] transition-colors">
                  Update Links
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-red-500/20 bg-red-500/10">
              <h2 className="text-[16px] font-medium text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Danger Zone
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[14px] font-medium text-white mb-1">Delete Account</h3>
                  <p className="text-[13px] text-[#A3A3A3] max-w-[500px]">
                    Permanently delete your account and all of your data. This action cannot be undone. All your applications and team memberships will be removed.
                  </p>
                </div>
                <button 
                  onClick={() => setIsDeleting(true)}
                  className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-red-500/20 hover:border-red-500/30 transition-colors whitespace-nowrap"
                >
                  Delete Account
                </button>
              </div>

              {isDeleting && (
                <div className="mt-6 p-4 border border-red-500/30 bg-[#111111] rounded-lg flex flex-col items-start">
                  <div className="flex items-start gap-3 mb-4 text-red-400">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-[13px]">
                      Are you absolutely sure you want to delete your account? This action cannot be reversed. To confirm, please type <strong className="text-white font-mono">delete my account</strong> below.
                    </p>
                  </div>
                  <input 
                    type="text" 
                    placeholder="delete my account"
                    className="w-full max-w-[300px] bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-red-500/50 transition-colors mb-4"
                  />
                  <div className="flex gap-3">
                    <button className="bg-red-500 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-red-600 transition-colors">
                      Confirm Deletion
                    </button>
                    <button 
                      onClick={() => setIsDeleting(false)}
                      className="bg-transparent text-[#A3A3A3] px-4 py-2 rounded-lg text-[13px] hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
