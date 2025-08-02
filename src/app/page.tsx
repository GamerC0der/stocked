"use client";

import { Component } from "@/components/ui/bg-gradient";
import { ButtonCta } from "@/components/ui/button-shiny";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleDashboardClick = () => {
    router.push('/dashboard');
  };

  return (
    <div className="relative min-h-screen">
      <Component />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20 gap-8">
        <h1 className="text-white text-6xl font-bold animate-fade-in">Stocked</h1>
        <div className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <ButtonCta 
            label="Enter the Dashboard" 
            className="w-fit" 
            onClick={handleDashboardClick}
          />
        </div>
      </div>
    </div>
  );
}
