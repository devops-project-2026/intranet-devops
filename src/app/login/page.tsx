"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Rocket, ArrowRight } from "lucide-react";
import { COMMUNITY_PATH, getHomePath } from "@/lib/authRoutes";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let isActive = true;

    const redirectAuthenticatedUser = async () => {
      try {
        const userRes = await fetch("http://localhost:8000/api/user/me", {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.message || errorData.error || "Invalid email or password";
        throw new Error(message);
      }

      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        
        // Fetch user profile to determine role and redirect accordingly
        try {
          const userRes = await fetch("http://localhost:8000/api/user/me", {
            headers: {
              Authorization: `Bearer ${data.token}`
            }
          });
          
          if (userRes.ok) {
            const userData = await userRes.json();
            router.replace(getHomePath(userData.roles));
          } else {
             router.replace(COMMUNITY_PATH); // fallback
          }
        } catch {
          router.replace(COMMUNITY_PATH); // fallback
        }
      } else {
        setError("Invalid response from server");
      }
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
        <div className="mb-16 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0a1b44] rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-900/20">
            <Rocket size={18} className="transform -rotate-12" />
          </div>
          <div>
            <h1 className="text-[15px] font-black text-[#0a1b44] tracking-tight uppercase leading-none">The Catalyst</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Business Incubator Intranet</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[420px] w-full mx-auto md:mx-0">
          <h2 className="text-4xl md:text-[42px] font-bold text-gray-900 mb-2 tracking-tight">
            Welcome back.
          </h2>
          <p className="text-[15px] text-gray-500 mb-10">
            Sign in to your founder account to continue.
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-medium text-sm">
                  @
                </div>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3.5 bg-[#f1f3f6] border-none rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none transition-all text-[14px] font-medium text-gray-800 placeholder-gray-400"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[11px] font-bold text-[#0a1b44] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                id="remember"
                className="w-4 h-4 rounded border-gray-300 text-[#0a1b44] focus:ring-[#0a1b44]"
              />
              <label htmlFor="remember" className="ml-3 text-[13px] text-gray-600">
                Remember this device
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-4 bg-[#0a1b44] text-white rounded-xl font-bold hover:bg-[#11265c] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : (
                <>
                  <span>Log In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 flex flex-col items-center space-y-3 border-t border-gray-100 pt-8">
         
            <p className="text-[13px] text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[#0a1b44] font-bold hover:underline">Sign Up</Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-12 px-0">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-[#22c55e] rounded-full mr-2"></div>
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">System Operational</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition-colors">Privacy</a>
            <a href="#" className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#0a1b44] to-[#142d72] relative overflow-hidden flex-col px-12 lg:px-20 py-20 justify-center">
        {/* Large faded text at bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none translate-y-1/4">
          <h1 className="text-[180px] font-black text-white/[0.05] tracking-tighter m-0 p-0 text-center">
            CATALYST
          </h1>
        </div>

        <div className="relative z-10 max-w-xl mx-auto w-full">
          <div className="inline-flex items-center px-4 py-1.5 mb-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-[10px] font-bold tracking-widest text-white uppercase w-max">
            <div className="w-1.5 h-1.5 bg-[#a4b5e6] rounded-full mr-2"></div>
            Cohort Autumn 24
          </div>

          <h2 className="text-5xl lg:text-[64px] font-bold text-white mb-6 leading-[1.05] tracking-tight">
            Elevate your<br/>vision to a<br/><span className="text-[#a4b5e6]">venture.</span>
          </h2>

          <p className="text-[#b4c5fb] text-lg font-light leading-relaxed mb-12">
            Access the network and guidance designed to scale the next generation of industry leaders.
          </p>

          <div className="flex flex-col xl:flex-row gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex-1 shadow-lg">
              <div className="text-3xl font-black text-white mb-1">450+</div>
              <div className="text-[10px] font-bold tracking-widest text-[#a4b5e6] uppercase">Active<br/>Ventures</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex-1 shadow-lg">
              <div className="text-3xl font-black text-[#a4b5e6] mb-1">$2.4B</div>
              <div className="text-[10px] font-bold tracking-widest text-[#a4b5e6] uppercase">Total<br/>Funding</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
