"use client";

import { Component } from "@/components/ui/bg-gradient";
import { ButtonCta } from "@/components/ui/button-shiny";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { TrendingUp, BarChart3, PieChart, Download, Search, Eye, Zap, Shield, Globe, ArrowRight, Star, Users, Activity, Check, Play, Quote, Award, Target, TrendingDown, DollarSign, Clock, BarChart, Sparkles, Rocket, ArrowUpRight, MousePointer, Layers, Cpu, Database, TrendingUpIcon, TrendingDownIcon, Volume2, Calendar, BarChart4, LineChart, PieChart as PieChartIcon, Brain, Mic, MicOff, TrendingUp as TrendingUpIcon2, Bell } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [liveData, setLiveData] = useState({
    aapl: { price: 185.50, change: 2.35, changePercent: 1.28 },
    tsla: { price: 245.20, change: -3.80, changePercent: -1.53 },
    googl: { price: 142.80, change: 1.20, changePercent: 0.85 },
    msft: { price: 378.90, change: 4.10, changePercent: 1.09 }
  });
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, vx: number, vy: number, size: number}>>([]);
  const [aiInsights, setAiInsights] = useState([
    "AAPL showing bullish momentum with RSI at 65",
    "TSLA volume spike detected - potential breakout",
    "Market sentiment: 73% bullish on tech stocks",
    "GOOGL approaching resistance at $145.00"
  ]);
  const [currentInsight, setCurrentInsight] = useState(0);
  const [voiceActive, setVoiceActive] = useState(false);
  const [typingText, setTypingText] = useState("");
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

    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 4);
    }, 3000);

    const particleInterval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        vx: particle.x <= 0 || particle.x >= window.innerWidth ? -particle.vx : particle.vx,
        vy: particle.y <= 0 || particle.y >= window.innerHeight ? -particle.vy : particle.vy
      })));
    }, 50);

    const dataInterval = setInterval(() => {
      setLiveData(prev => ({
        aapl: { ...prev.aapl, price: prev.aapl.price + (Math.random() - 0.5) * 0.5, change: prev.aapl.change + (Math.random() - 0.5) * 0.1 },
        tsla: { ...prev.tsla, price: prev.tsla.price + (Math.random() - 0.5) * 0.8, change: prev.tsla.change + (Math.random() - 0.5) * 0.2 },
        googl: { ...prev.googl, price: prev.googl.price + (Math.random() - 0.5) * 0.3, change: prev.googl.change + (Math.random() - 0.5) * 0.05 },
        msft: { ...prev.msft, price: prev.msft.price + (Math.random() - 0.5) * 0.4, change: prev.msft.change + (Math.random() - 0.5) * 0.1 }
      }));
    }, 2000);

    const insightInterval = setInterval(() => {
      setCurrentInsight(prev => (prev + 1) % aiInsights.length);
    }, 4000);

    const typingInterval = setInterval(() => {
      const currentText = aiInsights[currentInsight];
      setTypingText(currentText.slice(0, Math.floor(Date.now() / 100) % (currentText.length + 1)));
    }, 100);
    
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
        clearInterval(interval);
        clearInterval(particleInterval);
        clearInterval(dataInterval);
        clearInterval(insightInterval);
        clearInterval(typingInterval);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('mousemove', handleMouseMove);
      };
  }, []);

  const handleDashboardClick = () => {
    router.push('/dashboard');
  };

  const features = [
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Real-Time Charts",
      description: "Interactive stock charts with multiple timeframes and technical indicators",
      color: "text-blue-500",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Advanced Analytics",
      description: "SMA, EMA, RSI, MACD, and Bollinger Bands for professional analysis",
      color: "text-green-500",
      gradient: "from-green-500/20 to-emerald-500/20"
    },
    {
      icon: <Download className="h-8 w-8" />,
      title: "Export Data",
      description: "Export charts as CSV or PDF for reports and analysis",
      color: "text-purple-500",
      gradient: "from-purple-500/20 to-pink-500/20"
    },
    {
      icon: <Search className="h-8 w-8" />,
      title: "Smart Search",
      description: "Find any stock with intelligent search and watchlist management",
      color: "text-orange-500",
      gradient: "from-orange-500/20 to-red-500/20"
    }
  ];

  const stats = [
    { number: "10K+", label: "Stocks Available", icon: <Globe className="h-5 w-5" />, delay: 0 },
    { number: "Real-time", label: "Market Data", icon: <Activity className="h-5 w-5" />, delay: 200 },
    { number: "24/7", label: "Access", icon: <Shield className="h-5 w-5" />, delay: 400 },
    { number: "Free", label: "Forever", icon: <Star className="h-5 w-5" />, delay: 600 }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Portfolio Manager",
      company: "TechVentures Capital",
      content: "$tocked has transformed how I analyze markets. The real-time data and technical indicators are invaluable for my investment decisions.",
      avatar: "SC",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Day Trader",
      company: "Independent",
      content: "The charting tools are incredible. I can spot trends faster and make better trades. This is exactly what I needed.",
      avatar: "MR",
      rating: 5
    },
    {
      name: "Emily Watson",
      role: "Financial Analyst",
      company: "Global Investments",
      content: "Professional-grade analytics in a beautiful interface. The export features save me hours every week.",
      avatar: "EW",
      rating: 5
    }
  ];

  const benefits = [
    {
      icon: <Target className="h-6 w-6" />,
      title: "Precision Trading",
      description: "Make informed decisions with professional-grade technical analysis tools",
      delay: 0
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Real-Time Updates",
      description: "Never miss a market move with live data and instant notifications",
      delay: 100
    },
    {
      icon: <BarChart className="h-6 w-6" />,
      title: "Advanced Charts",
      description: "Multiple chart types, timeframes, and indicators for comprehensive analysis",
      delay: 200
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Export & Share",
      description: "Export your analysis as CSV or PDF for reports and presentations",
      delay: 300
    },
    {
      icon: <Search className="h-6 w-6" />,
      title: "Smart Search",
      description: "Find any stock instantly with intelligent search and watchlist management",
      delay: 400
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Reliable",
      description: "Bank-grade security with 99.9% uptime for uninterrupted trading",
      delay: 500
    }
  ];

  const techStack = [
    { name: "Next.js 15", icon: "⚡", description: "Latest React framework" },
    { name: "Real-time Data", icon: "📊", description: "Live market feeds" },
    { name: "AI-Powered", icon: "🤖", description: "Smart analytics" },
    { name: "Cloud Native", icon: "☁️", description: "Scalable infrastructure" }
  ];

  const chartData = [
    { time: '9:30', price: 185.2 },
    { time: '10:00', price: 186.1 },
    { time: '10:30', price: 185.8 },
    { time: '11:00', price: 186.5 },
    { time: '11:30', price: 187.2 },
    { time: '12:00', price: 186.9 },
    { time: '12:30', price: 187.5 },
    { time: '13:00', price: 188.1 },
    { time: '13:30', price: 187.8 },
    { time: '14:00', price: 188.3 },
    { time: '14:30', price: 188.7 },
    { time: '15:00', price: 189.1 },
    { time: '15:30', price: 188.9 },
    { time: '16:00', price: 189.3 }
  ];

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
            <a 
              href="#features" 
              className={`text-sm font-medium transition-all duration-300 hover:text-green-400 ${activeSection === 'features' ? 'text-green-400' : 'text-white/80'}`}
            >
              Features
            </a>
            <a 
              href="#pricing" 
              className={`text-sm font-medium transition-all duration-300 hover:text-green-400 ${activeSection === 'pricing' ? 'text-green-400' : 'text-white/80'}`}
            >
              Pricing
            </a>
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
