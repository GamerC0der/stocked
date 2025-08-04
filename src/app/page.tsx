"use client";

import { Component } from "@/components/ui/bg-gradient";
import { ButtonCta } from "@/components/ui/button-shiny";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowUpRight, Check } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeSection, setActiveSection] = useState('hero');
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, vx: number, vy: number, size: number}>>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
    
    const initialParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1
    }));
    setParticles(initialParticles);

    const particleInterval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        vx: particle.x <= 0 || particle.x >= window.innerWidth ? -particle.vx : particle.vx,
        vy: particle.y <= 0 || particle.y >= window.innerHeight ? -particle.vy : particle.vy
      })));
    }, 50);
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      const sections = [
        { id: 'hero', ref: heroRef },
        { id: 'features', ref: featuresRef },
        { id: 'pricing', ref: pricingRef }
      ];
      
      for (const section of sections) {
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
          return () => {
        clearInterval(particleInterval);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('mousemove', handleMouseMove);
      };
  }, []);

  const handleDashboardClick = () => {
    router.push('/dashboard');
  };














  return (
    <div className="relative min-h-screen overflow-hidden">
      <Component />
      
      <div className="fixed inset-0 pointer-events-none z-0">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute bg-white/20 rounded-full animate-pulse"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              animationDelay: `${particle.id * 0.1}s`
            }}
          />
        ))}
      </div>
      
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
            transition: 'all 0.1s ease-out'
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>
      
      <nav className={`relative z-20 fixed top-0 w-full p-6 transition-all duration-500 ${scrollY > 100 ? 'bg-black/30 backdrop-blur-xl border-b border-white/10' : ''}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 group cursor-pointer">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-lg">$</span>
            </div>
            <span className="text-white font-bold text-xl group-hover:text-green-400 transition-colors">tocked</span>
          </div>
          <div className="flex items-center space-x-8">
            <ButtonCta 
              label="Get Started" 
              className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
              onClick={handleDashboardClick}
            />
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20 gap-8 px-6">
        <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2 mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4 text-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Try it Now</span>
          </div>
          

                      <h1 className="text-white text-7xl md:text-8xl font-bold animate-fade-in mb-6 relative">
              <span className="text-green-500 hover:text-green-400 transition-colors duration-300 cursor-pointer">$</span>tocked
            </h1>
                      <p className="text-white/80 text-xl md:text-2xl max-w-3xl mx-auto mb-8 leading-relaxed">
              Modern. Powerful. Clean.
            </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <ButtonCta 
              label="Launch Dashboard" 
              className="text-lg px-8 py-4 bg-green-500 hover:bg-green-600 shadow-lg hover:scale-105 transition-all duration-300 group"
              onClick={handleDashboardClick}
            >
              <ArrowUpRight className="h-4 w-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </ButtonCta>
          </div>
          <div className="flex items-center justify-center gap-8 text-white/60 text-sm flex-wrap">
            <div className="flex items-center gap-2 hover:text-green-400 transition-colors cursor-pointer">
              <Check className="h-4 w-4 text-green-400" />
              <span>Real-time data</span>
            </div>
            <div className="flex items-center gap-2 hover:text-green-400 transition-colors cursor-pointer">
              <Check className="h-4 w-4 text-green-400" />
              <span>Advanced charts</span>
            </div>
            <div className="flex items-center gap-2 hover:text-green-400 transition-colors cursor-pointer">
              <Check className="h-4 w-4 text-green-400" />
              <span>Export data</span>
            </div>
          </div>
        </div>






      </section>
    </div>
  );
}
