import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const Home = () => {
  // --- Carousel State & Logic ---
  const [tick, setTick] = useState(0);

  // Desktop (Horizontal) images (3 images)
  const desktopImages = [
    "https://i.postimg.cc/NMdL77x0/insight-U-dashboard.png",
    "https://i.postimg.cc/Y0s1Cw4Y/desktop-dashboard-02.webp",
    "https://i.postimg.cc/kG4QC55f/desktop-dashboard-03.webp",
    "https://i.postimg.cc/kGpxgdV8/desktop-dashboard-04.webp",
  ];

  // Mobile (Vertical) images (5 images)
  const mobileImages = [
    "https://i.postimg.cc/D0bg9Z0k/mobile-dasbhoard-01.webp",
    "https://i.postimg.cc/GtsQW2t1/mobile-dasbhoard-02.webp",
    "https://i.postimg.cc/kGtc04Gr/mobile-dasbhoard-03.webp",
    "https://i.postimg.cc/kGtc04GP/mobile-dasbhoard-04.webp",
    "https://i.postimg.cc/Xqy8RJqW/mobile-dasbhoard-05.webp",
  ];

  useEffect(() => {
    // Increment the tick every 3 seconds
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Safely calculate the current index for both arrays regardless of length differences
  const currentDesktopIndex = tick % desktopImages.length;
  const currentMobileIndex = tick % mobileImages.length;

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-gray-800 selection:bg-indigo-100 overflow-hidden">
      {/* Modern SaaS Background Effects */}
      <div className="absolute top-[-10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-purple-400/10 blur-[100px] pointer-events-none" />
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-multiply" />

      {/* Navigation Bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 mx-auto max-w-[1440px] ">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 md:size-12 rounded-xl bg-white shadow-sm border border-gray-100 p-1.5">
            <img
              src="https://i.postimg.cc/C1Y20bkT/logo.webp"
              alt="insightU-logo"
              className="object-contain w-full h-full"
            />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900">
              InsightU
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Link
            to="/login"
            className="px-4 md:px-5 py-2 md:py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:text-indigo-600"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="px-5 md:px-6 py-2 md:py-2.5 text-sm font-semibold text-white transition-all bg-indigo-600 rounded-full shadow-md hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5"
          >
            Sign up free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className=" relative z-10 flex flex-col-reverse items-center justify-between px-4 py-1 mx-auto lg:flex-row max-w-[1440px] lg:py-24 gap-12 lg:gap-20">
        {/* Left Side: Copy & Call to Actions */}
        <div className="flex-1 w-full space-y-4 text-center lg:text-left lg:max-w-2xl">
          {/* SaaS Update Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mx-auto lg:mx-0 rounded-full bg-indigo-50 border border-indigo-100 shadow-sm">
            <span className="flex items-center justify-center size-5 text-[10px] text-white bg-indigo-600 rounded-full">
              ✨
            </span>
            <span className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              The Student Dashboard
            </span>
          </div>

          <div className="space-y-6">
            <h2 className="text-5xl font-extrabold leading-[1.1] text-gray-900 md:text-6xl lg:text-[4.5rem] tracking-tight">
              Know Yourself. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Learn Better.
              </span>
            </h2>
            <p className="max-w-xl mx-auto text-lg md:text-xl leading-relaxed text-gray-500 lg:mx-0">
              The ultimate AI-driven daily reflection and habit-tracking
              dashboard. Build self-regulation, align your goals, and unlock
              your academic potential today.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start pt-4">
            <Link
              to="/register"
              className="w-full px-8 py-4 text-base font-semibold text-center text-white transition-all transform rounded-full shadow-lg sm:w-auto bg-indigo-600 hover:-translate-y-1 hover:shadow-xl hover:bg-indigo-700"
            >
              Start Tracking Now
            </Link>
            <button className="w-full px-8 py-4 text-base font-semibold transition-all rounded-full sm:w-auto text-indigo-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm">
              See How It Works
            </button>
          </div>

          {/* Small social proof / reassurance */}
          <div className="flex items-center justify-center gap-6 lg:justify-start pt-2 pb-3">
            <p className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              Free for students
            </p>
          </div>
        </div>

        {/* Right Side: Dashboard Carousel Preview */}
        <div className="flex-1 w-full relative perspective-1000">
          {/* --- DESKTOP PREVIEW (Hidden on Mobile) --- */}
          {/* Using aspect-video (16:9) so it looks like a real laptop screen */}
          <div className="hidden lg:block relative w-full aspect-video rounded-[1.5rem] p-2 bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.3)] group">
            <div className="relative w-full h-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
              {desktopImages.map((src, index) => (
                <img
                  key={`desktop-${index}`}
                  src={src}
                  alt={`InsightU Desktop View ${index + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                    index === currentDesktopIndex
                      ? "opacity-100 z-10"
                      : "opacity-0 z-0"
                  }`}
                />
              ))}
            </div>

            {/* Desktop Dots */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {desktopImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setTick(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentDesktopIndex
                      ? "w-8 bg-indigo-600"
                      : "w-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* --- MOBILE PREVIEW (Hidden on Desktop) --- */}
      {/* Using a sleek smartphone frame layout */}
      <div className="pb-5 block lg:hidden relative w-full max-w-[320px] mx-auto aspect-[9/19] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl border-[6px] border-gray-800">
        {/* Fake Phone Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-20"></div>

        <div className="relative w-full h-full overflow-hidden rounded-[2rem] bg-gray-50">
          {mobileImages.map((src, index) => (
            <img
              key={`mobile-${index}`}
              src={src}
              alt={`InsightU Mobile View ${index + 1}`}
              /* Changed to object-contain so NO vertical screenshot is cut off */
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out bg-white ${
                index === currentMobileIndex
                  ? "opacity-100 z-10"
                  : "opacity-0 z-0"
              }`}
            />
          ))}
        </div>

        {/* Mobile Dots */}
        <div className=" pt-2 absolute left-1/2 -translate-x-1/2 flex gap-3">
          {mobileImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setTick(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentMobileIndex
                  ? "w-8 bg-indigo-600"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
