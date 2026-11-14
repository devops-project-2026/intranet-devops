"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Rocket } from "lucide-react";
import { COMMUNITY_PATH, getHomePath } from "@/lib/authRoutes";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let isActive = true;

    const redirectAuthenticatedUser = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const userRes = await fetch(`${apiUrl}/api/user/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isActive) return;

        if (userRes.ok) {
          const userData = await userRes.json();
          router.replace(getHomePath(userData.roles));
        } else {
          router.replace(COMMUNITY_PATH);
        }
      } catch {
        if (isActive) {
          router.replace(COMMUNITY_PATH);
        }
      }
    };

    redirectAuthenticatedUser();

    return () => {
      isActive = false;
    };
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Sending company field to backend even if it might ignore it
        body: JSON.stringify({ name, email, password, companyName: company }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Registration failed");
      }

      setSuccessMessage("Your account has been created. Please check your email to verify your account.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left side - Form */}
      <div className="w-full md:w-1/2 min-h-screen flex flex-col py-12 px-8 md:px-16 lg:px-24 xl:px-32 relative z-10">
        
        {/* Logo */}
        <div className="mb-16">
          <h1 className="text-xl font-black text-[#0a1b44] tracking-tight uppercase">The Catalyst</h1>
          <p className="text-[13px] text-gray-500 mt-1">Founder Portal Access</p>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[420px] w-full mx-auto md:mx-0">
          <h2 className="text-4xl md:text-[42px] font-bold text-gray-900 mb-2 tracking-tight">
            Begin your venture.
          </h2>
          <p className="text-[15px] text-gray-600 mb-10">
            Complete the form below to join our ecosystem.
          </p>

          {successMessage ? (
            <div className="text-center p-6 bg-green-50 border border-green-100 rounded-xl">
              <h3 className="text-lg font-bold text-green-800 mb-2">Registration Successful!</h3>
              <p className="text-green-700 text-sm mb-4">{successMessage}</p>
              <Link href="/login" className="inline-block px-6 py-3 bg-[#0a1b44] text-white rounded-xl font-bold hover:bg-[#11265c] transition-colors">
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-[#f1f3f6] border-none rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none transition-all text-[14px] font-medium text-gray-800 placeholder-gray-400"
                placeholder="Alex Sterling"
              />
            </div>


            <div>
              <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-[#f1f3f6] border-none rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none transition-all text-[14px] font-medium text-gray-800 placeholder-gray-400"
                placeholder="alex@venture.ai"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-4 pr-12 py-3.5 bg-[#f1f3f6] border-none rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none transition-all text-sm font-bold text-gray-800 tracking-widest placeholder-gray-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700"
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center pt-2 pb-4">
              <input
                type="checkbox"
                id="terms"
                required
                className="w-4 h-4 rounded border-gray-300 text-[#0a1b44] focus:ring-[#0a1b44]"
              />
              <label htmlFor="terms" className="ml-3 text-[13px] text-gray-600">
                I agree to the <a href="#" className="font-semibold text-[#0a1b44] hover:underline">Terms of Service</a> and <a href="#" className="font-semibold text-[#0a1b44] hover:underline">Privacy Policy</a>.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-4 bg-[#0a1b44] text-white rounded-xl font-bold hover:bg-[#11265c] transition-colors flex items-center justify-center shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Account..." : "Create Founder Account"}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0a1b44] font-bold hover:underline">
              Back to Login
            </Link>
          </p>
          </>
          )}
        </div>
      </div>


      {/* Right side - Information */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#0a1b44] to-[#142d72] relative overflow-hidden flex-col px-12 lg:px-20 py-20 justify-center">
        {/* Large faded text at bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none translate-y-1/4">
          <h1 className="text-[180px] font-black text-white/[0.05] tracking-tighter m-0 p-0 text-center">
            CATALYST
          </h1>
        </div>

        <div className="relative z-10 max-w-xl mx-auto w-full">
          <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-[11px] font-bold tracking-widest text-white uppercase flex items-center w-max">
            <div className="w-1.5 h-1.5 bg-[#a4b5e6] rounded-full mr-2"></div>
            Applications open for Q4
          </div>
          
          <h2 className="text-5xl lg:text-[64px] font-bold text-white mb-6 leading-[1.05] tracking-tight">
            Where vision meets <span className="text-[#a4b5e6]">systemic growth.</span>
          </h2>
          
          <p className="text-[#b4c5fb] text-lg font-light leading-relaxed mb-12">
            The Catalyst provides the architectural framework, capital network, and strategic guidance to scale your venture from concept to market leader.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Ventures Launched Card */}
            <div className="bg-[#b4c5fb] rounded-2xl p-6 relative overflow-hidden text-[#0a1b44]">
              <div className="mb-8">
                <Rocket size={20} className="text-[#0a1b44]" />
              </div>
              <div className="text-3xl font-black mb-1 tracking-tight">320+</div>
              <div className="text-[10px] font-bold tracking-widest uppercase">Ventures Launched</div>
            </div>
            
            {/* Capital Raised Card */}
            <div className="bg-[#b4c5fb] rounded-2xl p-6 relative overflow-hidden text-[#0a1b44]">
              <div className="mb-8 flex">
                <div className="w-6 h-4 border-2 border-[#0a1b44] rounded-sm relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#0a1b44] rounded-full"></div>
                </div>
              </div>
              <div className="text-3xl font-black mb-1 tracking-tight">$150M+</div>
              <div className="text-[10px] font-bold tracking-widest uppercase">Capital Raised</div>
            </div>
          </div>

          {/* Retention Rate Card */}
          <div className="bg-[#b4c5fb] rounded-2xl p-6 relative overflow-hidden text-[#0a1b44] flex items-end justify-between">
            <div>
              <div className="text-4xl font-black mb-1 tracking-tight">94%</div>
              <div className="text-[10px] font-bold tracking-widest uppercase">Founder Retention Rate</div>
            </div>
            <div className="flex -space-x-3">
              {/* Fake avatars */}
              <div className="w-10 h-10 rounded-full border-2 border-[#b4c5fb] bg-gray-400 overflow-hidden">
                <img src="https://i.pravatar.cc/100?img=11" alt="Founder" className="w-full h-full object-cover" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-[#b4c5fb] bg-gray-400 overflow-hidden">
                <img src="https://i.pravatar.cc/100?img=12" alt="Founder" className="w-full h-full object-cover" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-[#b4c5fb] bg-gray-400 overflow-hidden">
                <img src="https://i.pravatar.cc/100?img=5" alt="Founder" className="w-full h-full object-cover" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-[#b4c5fb] bg-blue-600 text-white flex items-center justify-center text-xs font-bold z-10">
                +50
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
