import { useState } from "react";
import { Calendar, Image as ImageIcon, FileText, Info, Plus, Trophy, Globe, MapPin } from "lucide-react";

export function CreateHackathon() {
  const [isOnline, setIsOnline] = useState(true);

  return (
    <div className="flex flex-col min-h-full pb-16">
      <div className="px-8 pt-8 max-w-[800px] w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-white">Create Hackathon</h1>
            <p className="text-[14px] text-[#8C8C8C] mt-1">Set up a new hackathon program and open applications.</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-[#212121] border border-white/[0.1] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:border-white/[0.2] transition-colors">
              Save Draft
            </button>
            <button className="bg-white text-black px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#ececec] transition-colors">
              Publish Program
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Basic Information */}
          <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#1A1A1A]">
              <h2 className="text-[16px] font-medium text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-[#8c8c8c]" />
                Basic Information
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">Hackathon Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Codex AI Spring 2026"
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">Tagline</label>
                <input 
                  type="text" 
                  placeholder="A short, catchy description (max 60 characters)"
                  maxLength={60}
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">Format</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${isOnline ? 'bg-white/[0.04] border-white/[0.2] text-white' : 'bg-[#1A1A1A] border-white/[0.05] text-[#8c8c8c] hover:border-white/[0.1]'}`}>
                    <input type="radio" name="format" className="hidden" checked={isOnline} onChange={() => setIsOnline(true)} />
                    <Globe className="w-4 h-4" />
                    <span className="text-[14px] font-medium">Online</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${!isOnline ? 'bg-white/[0.04] border-white/[0.2] text-white' : 'bg-[#1A1A1A] border-white/[0.05] text-[#8c8c8c] hover:border-white/[0.1]'}`}>
                    <input type="radio" name="format" className="hidden" checked={!isOnline} onChange={() => setIsOnline(false)} />
                    <MapPin className="w-4 h-4" />
                    <span className="text-[14px] font-medium">In-Person</span>
                  </label>
                </div>
              </div>

              {!isOnline && (
                <div className="space-y-1.5">
                  <label className="text-[13px] text-[#8c8c8c]">Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. San Francisco, CA"
                    className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Graphics */}
          <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#1A1A1A]">
              <h2 className="text-[16px] font-medium text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#8c8c8c]" />
                Branding & Graphics
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-[13px] text-[#8c8c8c] block mb-2">Cover Image</label>
                <div className="w-full h-40 border-2 border-dashed border-white/[0.1] rounded-xl bg-[#1A1A1A] flex flex-col items-center justify-center text-[#8c8c8c] hover:border-white/[0.2] hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <ImageIcon className="w-6 h-6 mb-2" />
                  <span className="text-[13px] font-medium text-white mb-1">Click to upload</span>
                  <span className="text-[12px]">Recommended: 1200 x 600px (JPG or PNG)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#1A1A1A]">
              <h2 className="text-[16px] font-medium text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#8c8c8c]" />
                Timeline
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">Registration Opens</label>
                <input 
                  type="date" 
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-[#8c8c8c] focus:text-white focus:outline-none focus:border-white/[0.3] transition-colors [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">Registration Deadline</label>
                <input 
                  type="date" 
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-[#8c8c8c] focus:text-white focus:outline-none focus:border-white/[0.3] transition-colors [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">Hacking Starts</label>
                <input 
                  type="date" 
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-[#8c8c8c] focus:text-white focus:outline-none focus:border-white/[0.3] transition-colors [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">Submission Deadline</label>
                <input 
                  type="date" 
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-[#8c8c8c] focus:text-white focus:outline-none focus:border-white/[0.3] transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#1A1A1A]">
              <h2 className="text-[16px] font-medium text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8c8c8c]" />
                Detailed Description
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">About the Hackathon (Markdown supported)</label>
                <textarea 
                  rows={8}
                  placeholder="Describe the main goals, themes, and expectations for the participants..."
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] text-[#8c8c8c]">Rules & Requirements</label>
                <textarea 
                  rows={5}
                  placeholder="List out specific rules, API requirements, team size limits..."
                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/[0.3] transition-colors resize-y"
                />
              </div>
            </div>
          </div>

          {/* Prizes */}
          <div className="bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] bg-[#1A1A1A] flex items-center justify-between">
              <h2 className="text-[16px] font-medium text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#8c8c8c]" />
                Prizes
              </h2>
              <button className="text-[13px] text-white flex items-center gap-1 hover:text-white/80 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Prize
              </button>
            </div>
            <div className="p-6">
              <div className="bg-[#1A1A1A] border border-white/[0.1] rounded-lg p-4 flex gap-4">
                <div className="w-12 h-12 bg-[#212121] rounded-lg flex items-center justify-center flex-shrink-0 text-yellow-500">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-3">
                  <input 
                    type="text" 
                    defaultValue="Grand Prize"
                    className="w-full bg-transparent text-[15px] font-medium text-white border-b border-white/[0.1] pb-1 focus:outline-none focus:border-white/[0.3] transition-colors placeholder-[#8c8c8c]"
                  />
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[12px] text-[#8c8c8c] block mb-1">Prize Value</label>
                      <input 
                        type="text" 
                        placeholder="$10,000"
                        className="w-full bg-[#111111] border border-white/[0.1] rounded-md px-2.5 py-1.5 text-[13px] text-white focus:outline-none focus:border-white/[0.3]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[12px] text-[#8c8c8c] block mb-1">Description</label>
                      <input 
                        type="text" 
                        placeholder="Cash prize + API credits"
                        className="w-full bg-[#111111] border border-white/[0.1] rounded-md px-2.5 py-1.5 text-[13px] text-white focus:outline-none focus:border-white/[0.3]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
