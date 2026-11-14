import { Rocket, Star, Info, MessageSquare, Files, ArrowRight, ArrowLeft, CheckCircle2, Circle, Megaphone, Calendar, ChevronRight } from "lucide-react";

export default function DashboardHome() {
  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-6">
      
      {/* Welcome Banner */}
      <div className="w-full bg-gradient-to-r from-[#0a1b44] to-[#2c4079] rounded-2xl p-10 text-white relative overflow-hidden">
        {/* Decorative pattern/overlay */}
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10">
          <h2 className="text-[32px] font-bold tracking-tight mb-2">Welcome back, Alex.</h2>
          <p className="text-[#a4b5e6] text-[15px] font-medium max-w-2xl leading-relaxed mb-8">
            Nexus AI Labs is currently at <span className="text-white font-bold">Stage 3: Market Validation</span>. Your next milestone is 4 days away.
          </p>
          <div className="flex gap-4">
            <button className="bg-white text-[#0a1b44] px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors">
              Review Roadmap
            </button>
            <button className="bg-transparent border border-[#a4b5e6] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors">
              Daily Briefing
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Days in Cohort</h3>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-[#0a1b44]">42</span>
            <div className="bg-blue-50 text-blue-600 text-[11px] font-bold px-2 py-1 rounded-md">+12%</div>
          </div>
          <div className="h-1 w-full bg-gray-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-blue-600 w-[45%] rounded-full"></div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Milestones Reached</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-[#0a1b44]">08</span>
              <span className="text-sm font-bold text-gray-400">/12</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#4f46e5] flex items-center justify-center text-white">
              <Star size={12} fill="white" />
            </div>
          </div>
          <p className="text-[12px] text-gray-500 font-medium italic mt-2">
            &quot;Foundational Tech Stack&quot; verified
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Next Advisor Sync</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[18px] font-black text-[#0a1b44] mb-1">Tomorrow, 10:30 AM</div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full overflow-hidden">
                   <img src="https://i.pravatar.cc/150?img=5" alt="Sarah" />
                </div>
                <span className="text-[11px] font-medium text-gray-500">with Sarah Jenkins (Product Strategy)</span>
              </div>
            </div>
            <button className="bg-[#4f46e5] hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[12px] font-bold shadow-sm transition-colors">
              Prepare Docs
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Community Pulse) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-[#0a1b44]">Community Pulse</h2>
            <a href="#" className="text-[12px] font-bold text-[#0a1b44] hover:underline">View All Activity</a>
          </div>

          {/* Feed Item 1 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Rocket size={18} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-[14px] font-bold text-gray-900">Lumina Health raised a $2M Seed Round!</h3>
                <span className="text-[11px] font-medium text-gray-400">2h ago</span>
              </div>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
                Congrats to David and the team for hitting this massive milestone. They&apos;ve been quiet for a reason!
              </p>
              <div className="flex gap-4 text-[12px] font-bold text-gray-500">
                <button className="flex items-center gap-1.5 hover:text-gray-800"><Star size={14} /> 24 Likes</button>
                <button className="flex items-center gap-1.5 hover:text-gray-800"><MessageSquare size={14} /> 8 Comments</button>
              </div>
            </div>
          </div>

          {/* Feed Item 2 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
              <Megaphone size={18} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-[14px] font-bold text-gray-900">New Workshop: Pricing for B2B SaaS</h3>
                <span className="text-[11px] font-medium text-gray-400">5h ago</span>
              </div>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
                Incubator Team scheduled a new session on multi-tier pricing strategies for the growth phase.
              </p>
              <button className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-[11px] font-bold hover:bg-gray-200 transition-colors">
                View Session
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Announcements */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 rounded-full bg-[#0a1b44] flex items-center justify-center text-white">
                <Info size={12} />
              </div>
              <h2 className="text-[15px] font-bold text-gray-900 leading-tight">Latest<br/>Announcements</h2>
            </div>
            
            <div className="space-y-5">
              <div className="relative pl-4 border-l-2 border-blue-500">
                <h4 className="text-[10px] font-bold tracking-widest text-blue-600 uppercase mb-1">Upcoming Event</h4>
                <p className="text-[13px] font-bold text-gray-900 mb-1 leading-snug">Founder Happy Hour @ The Rooftop</p>
                <p className="text-[11px] font-medium text-gray-500">Friday, Oct 24th • 6:00 PM</p>
              </div>
              <div className="relative pl-4 border-l-2 border-gray-200">
                <h4 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Network Alert</h4>
                <p className="text-[13px] font-bold text-gray-900 mb-1 leading-snug">Scheduled server maintenance for Venture OS</p>
                <p className="text-[11px] font-medium text-gray-500">Oct 28th • 12:00 AM - 4:00 AM</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-200 group transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">Submit Request</span>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600" />
              </button>
              <button className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-200 group transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                    <Calendar size={14} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">Book Office Hours</span>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600" />
              </button>
              <button className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-200 group transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                    <Files size={14} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">Update KPIs</span>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Venture Roadmap */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#0a1b44] mb-2">Venture Roadmap</h2>
            <p className="text-[13px] text-gray-500 font-medium max-w-md leading-relaxed">
              Your personalized path through the Series A track. Complete validated milestones to unlock the next growth stage.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-[#0a1b44] hover:bg-gray-50 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0a1b44] text-white hover:bg-[#11265c] transition-colors shadow-sm">
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x">
          {/* Stage 1 */}
          <div className="w-[320px] flex-shrink-0 bg-[#f8f9fc] border border-blue-200 rounded-2xl p-6 relative snap-start">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-t-2xl"></div>
            <div className="flex justify-between items-center mb-4">
              <div className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Completed</div>
              <CheckCircle2 size={16} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Stage 1: Ideation</h3>
            <p className="text-[12px] text-gray-500 mb-6 min-h-[40px]">Core hypothesis testing and problem-solution fit discovery.</p>
            <div>
              <div className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mb-1">Key Achievement</div>
              <div className="text-[12px] font-bold text-gray-800">Founder Intent Document Signed</div>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="w-[320px] flex-shrink-0 bg-[#f8f9fc] border border-blue-200 rounded-2xl p-6 relative snap-start">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl"></div>
            <div className="flex justify-between items-center mb-4">
              <div className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Completed</div>
              <CheckCircle2 size={16} className="text-purple-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Stage 2: Prototyping</h3>
            <p className="text-[12px] text-gray-500 mb-6 min-h-[40px]">Development of MVP and initial internal testing phases.</p>
            <div>
              <div className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mb-1">Key Achievement</div>
              <div className="text-[12px] font-bold text-gray-800">MVP Production Deployment</div>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="w-[320px] flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-6 relative shadow-[0_8px_30px_rgb(0,0,0,0.08)] scale-105 transform origin-left z-10 snap-start">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 rounded-t-2xl"></div>
            <div className="flex justify-between items-center mb-4">
              <div className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">In Progress</div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Stage 3: Market Val.</h3>
            <p className="text-[12px] text-gray-500 mb-6">Early customer acquisition and feedback implementation.</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span className="text-[12px] font-medium text-gray-800">Alpha User Testing</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle size={14} className="text-gray-300" />
                <span className="text-[12px] font-medium text-gray-500">Retain 40% W1 cohort</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
