"use client";

import { Component } from "@/components/ui/bg-gradient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { ButtonCta } from "@/components/ui/button-shiny";
import { useState, useEffect } from "react";
import { fetchMultipleStocks, fetchStockChart, fetchStockQuote, type StockData, type ChartData } from "@/lib/stock-api";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus } from "lucide-react";
import DateRangePicker, { type DateRange } from "@/components/ui/date-range";

const stockSymbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "NFLX", "SPY", "QQQ"];

export default function Dashboard() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  const [customStockSymbol, setCustomStockSymbol] = useState("");
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [daysRange, setDaysRange] = useState<7 | 30 | 90>(30);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [compareOn, setCompareOn] = useState(false);
  const [compareSymbol, setCompareSymbol] = useState<string | null>(null);
  const [compareChartData, setCompareChartData] = useState<ChartData[]>([]);
  const [primaryFilter, setPrimaryFilter] = useState("");
  const [compareFilter, setCompareFilter] = useState("");
  const [primaryActiveIdx, setPrimaryActiveIdx] = useState(0);
  const [compareActiveIdx, setCompareActiveIdx] = useState(0);
  const [primaryShowAll, setPrimaryShowAll] = useState(false);
  const [compareShowAll, setCompareShowAll] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showIPOs, setShowIPOs] = useState(false);
  const [ipos, setIpos] = useState<Array<{symbol: string, name: string, date: string, price: string}>>([]);
  const [loadingIPOs, setLoadingIPOs] = useState(false);
  const [showTechnicalIndicators, setShowTechnicalIndicators] = useState(false);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [comparePreviousPrice, setComparePreviousPrice] = useState<number | null>(null);
  const [indicators, setIndicators] = useState({
    rsi: { enabled: false, period: 14 },
    macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    bollinger: { enabled: false, period: 20, stdDev: 2 },
    sma: { enabled: false, period: 20 },
    ema: { enabled: false, period: 20 }
  });

  function scoreStock(q: string, s: { symbol: string; name: string }) {
    const qq = q.toLowerCase();
    const sym = s.symbol.toLowerCase();
    const name = s.name.toLowerCase();
    if (sym.startsWith(qq)) return 1000 - (sym.length - qq.length);
    if (name.startsWith(qq)) return 800 - (name.length - qq.length);
    if (sym.includes(qq)) return 600 - sym.indexOf(qq);
    if (name.includes(qq)) return 400 - name.indexOf(qq);
    return -1;
  }

  function roundToNearestFive(price: number): number {
    return Math.round(price / 5) * 5;
  }

  function highlight(text: string, q: string) {
    if (!q) return text as any;
    const lower = text.toLowerCase();
    const ql = q.toLowerCase();
    const i = lower.indexOf(ql);
    if (i < 0) return text as any;
    return (
      <>
        {text.slice(0, i)}
        <span className="bg-white/20 rounded px-0.5">{text.slice(i, i + q.length)}</span>
        {text.slice(i + q.length)}
      </>
    ) as any;
  }

  const fetchIPOs = async () => {
    setLoadingIPOs(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const dateParam = `${year}-${month}`;
      
      const response = await fetch(`https://corsproxy.io/?https://api.nasdaq.com/api/ipo/calendar?date=${dateParam}`);
      
      const data = await response.json();
      
      if (data.data && data.data.upcoming && data.data.upcoming.upcomingTable && data.data.upcoming.upcomingTable.rows) {
        const ipoData = data.data.upcoming.upcomingTable.rows.map((row: any) => ({
          symbol: row.proposedTickerSymbol || 'N/A',
          name: row.companyName || 'N/A',
          date: row.expectedPriceDate || 'N/A',
          price: row.proposedSharePrice ? `$${row.proposedSharePrice}` : 'N/A'
        }));
        setIpos(ipoData.slice(0, 10));
      } else {
        setIpos([]);
      }
    } catch (error) {
      setIpos([]);
    } finally {
      setLoadingIPOs(false);
    }
  };

  useEffect(() => {
    async function loadStocks() {
      setLoading(true);
      
      const defaultStockData = await fetchMultipleStocks(stockSymbols);
      
      const savedCustomStocks = localStorage.getItem('customStocks');
      let customStocks: StockData[] = [];
      
      if (savedCustomStocks) {
        try {
          const customSymbols = JSON.parse(savedCustomStocks);
          if (Array.isArray(customSymbols) && customSymbols.length > 0) {
            customStocks = await fetchMultipleStocks(customSymbols);
          }
        } catch (error) {
        }
      }
      
      const allStocks = [...defaultStockData, ...customStocks];
      setStocks(allStocks);
      setSelectedStock(allStocks[0] || null);
      
      if (allStocks[0]) {
        const chart = await fetchStockChart(allStocks[0].symbol, daysRange);
        setChartData(chart);
      }
      
      setLoading(false);
    }

    loadStocks();
    
    const interval = setInterval(loadStocks, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function computeOpen() {
      const now = new Date();
      const etString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const et = new Date(etString);
      const day = et.getDay();
      const hour = et.getHours();
      const minute = et.getMinutes();
      const year = et.getFullYear();
      const month = et.getMonth() + 1;
      const date = et.getDate();
      
      const isWeekend = day === 0 || day === 6;
      
      const holidays2025 = [
        { month: 1, date: 1, name: "New Year's Day" },
        { month: 1, date: 20, name: "Martin Luther King, Jr. Day" },
        { month: 2, date: 17, name: "Washington's Birthday" },
        { month: 4, date: 18, name: "Good Friday" },
        { month: 5, date: 26, name: "Memorial Day" },
        { month: 6, date: 19, name: "Juneteenth National Independence Day" },
        { month: 7, date: 4, name: "Independence Day" },
        { month: 9, date: 1, name: "Labor Day" },
        { month: 11, date: 27, name: "Thanksgiving Day" },
        { month: 12, date: 25, name: "Christmas Day" }
      ];
      
      const isHoliday = holidays2025.some(holiday => 
        holiday.month === month && holiday.date === date
      );
      
      const isEarlyClose = (
        (month === 11 && date === 28) ||
        (month === 12 && date === 24) || 
        (month === 7 && date === 3)      
      );
      
      const closeHour = isEarlyClose ? 13 : 16; 
      
      const isWeekday = day >= 1 && day <= 5;
      const afterOpen = hour > 9 || (hour === 9 && minute >= 30);
      const beforeClose = hour < closeHour;
      
      const isOpen = isWeekday && !isWeekend && !isHoliday && afterOpen && beforeClose;
      setIsMarketOpen(isOpen);
    }
    computeOpen();
    const id = setInterval(computeOpen, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedStock) return;
    (async () => {
      const chart = await fetchStockChart(selectedStock.symbol, daysRange);
      setChartData(chart);
      
      try {
        const extendedChart = await fetchStockChart(selectedStock.symbol, daysRange + 1);
        if (extendedChart.length > chart.length) {
          setPreviousPrice(extendedChart[0].price);
        }
      } catch (error) {
        setPreviousPrice(null);
      }
      
      if (compareOn && compareSymbol) {
        const comp = await fetchStockChart(compareSymbol, daysRange);
        setCompareChartData(comp);
        
        try {
          const extendedCompChart = await fetchStockChart(compareSymbol, daysRange + 1);
          if (extendedCompChart.length > comp.length) {
            setComparePreviousPrice(extendedCompChart[0].price);
          }
        } catch (error) {
          setComparePreviousPrice(null);
        }
      } else {
        setCompareChartData([]);
        setComparePreviousPrice(null);
      }
    })();
  }, [daysRange, selectedStock, compareOn, compareSymbol]);

  const handleStockChange = async (symbol: string) => {
    if (symbol === "add-custom") {
      setModalOpen(true);
      return;
    }
    
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
      setSelectedStock(stock);
      const chart = await fetchStockChart(symbol, daysRange);
      setChartData(chart);
    }
  };

  const handleAddCustomStock = async () => {
    if (!customStockSymbol.trim()) return;
    
    setIsAddingStock(true);
    try {
      const originalSymbol = customStockSymbol.trim().toUpperCase();
      const stockData = await fetchStockQuote(originalSymbol);
      if (stockData) {
        setStocks(prev => [...prev, stockData]);
        setSelectedStock(stockData);
        const chart = await fetchStockChart(stockData.symbol, daysRange);
        setChartData(chart);
        setCustomStockSymbol("");
        setModalOpen(false);
        
        const savedCustomStocks = localStorage.getItem('customStocks');
        let customSymbols: string[] = [];
        
        if (savedCustomStocks) {
          try {
            customSymbols = JSON.parse(savedCustomStocks);
                  } catch (error) {
        }
        }
        
        if (!customSymbols.includes(stockData.symbol)) {
          customSymbols.push(stockData.symbol);
          localStorage.setItem('customStocks', JSON.stringify(customSymbols));
        }
        
        if (stockData.symbol !== originalSymbol) {
        }
      } else {
        alert(`Could not find stock data for ${originalSymbol}. Please check the symbol and try again.`);
      }
    } catch (error) {
      alert("Error adding custom stock. Please try again.");
    } finally {
      setIsAddingStock(false);
    }
  };

  const removeCustomStock = (symbolToRemove: string) => {
    setStocks(prev => prev.filter(stock => stock.symbol !== symbolToRemove));
    
    const savedCustomStocks = localStorage.getItem('customStocks');
    if (savedCustomStocks) {
      try {
        const customSymbols = JSON.parse(savedCustomStocks);
        const updatedSymbols = customSymbols.filter((symbol: string) => symbol !== symbolToRemove);
        localStorage.setItem('customStocks', JSON.stringify(updatedSymbols));
      } catch (error) {
      }
    }
    
    if (selectedStock?.symbol === symbolToRemove) {
      const remainingStocks = stocks.filter(stock => stock.symbol !== symbolToRemove);
      if (remainingStocks.length > 0) {
        setSelectedStock(remainingStocks[0]);
        fetchStockChart(remainingStocks[0].symbol, daysRange).then(setChartData);
      }
    }
  };

  const searchStocks = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`https://corsproxy.io/?https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`);
      const data = await response.json();
      
      if (data.quotes) {
        const results = data.quotes.map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setCustomStockSymbol(query);
    searchStocks(query);
  };

  const selectSearchResult = (symbol: string) => {
    setCustomStockSymbol(symbol);
    setSearchQuery(symbol);
    setSearchResults([]);
  };

  function mergeForCompare(primary: ChartData[], secondary: ChartData[]) {
    if (!primary || primary.length === 0) return [] as any[];
    const byDate1 = new Map(primary.map(d => [d.date, d.price]));
    const byDate2 = new Map(secondary.map(d => [d.date, d.price]));
    const overlapDates = primary.map(d => d.date).filter(dt => byDate2.has(dt));
    if (overlapDates.length === 0) {
      return primary.map(d => ({ date: d.date, p1: d.price }));
    }
    const firstOverlap = overlapDates[0];
    const base1 = byDate1.get(firstOverlap)!;
    const base2 = byDate2.get(firstOverlap)!;
    return primary.map(d => {
      const p1 = (d.price / base1) * 100;
      const s = byDate2.get(d.date);
      const p2 = s != null ? (s / base2) * 100 : undefined;
      return { date: d.date, p1, ...(p2 !== undefined ? { p2 } : {}) };
    });
  }

  function calculateSMA(data: ChartData[], period: number) {
    if (data.length < period) return [];
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.price, 0);
      sma.push({ date: data[i].date, value: sum / period });
    }
    return sma;
  }

  function calculateEMA(data: ChartData[], period: number) {
    if (data.length < period) return [];
    const ema = [];
    const multiplier = 2 / (period + 1);
    let emaValue = data.slice(0, period).reduce((acc, d) => acc + d.price, 0) / period;
    
    for (let i = 0; i < data.length; i++) {
      if (i >= period - 1) {
        emaValue = (data[i].price * multiplier) + (emaValue * (1 - multiplier));
      }
      ema.push({ date: data[i].date, value: emaValue });
    }
    return ema;
  }

  function calculateRSI(data: ChartData[], period: number) {
    if (data.length < period + 1) return [];
    const rsi = [];
    let gains = 0, losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = data[i].price - data[i - 1].price;
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = period; i < data.length; i++) {
      const change = data[i].price - data[i - 1].price;
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
      
      const rs = avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push({ date: data[i].date, value: rsiValue });
    }
    return rsi;
  }

  function calculateMACD(data: ChartData[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
    if (data.length < slowPeriod) return [];
    const emaFast = calculateEMA(data, fastPeriod);
    const emaSlow = calculateEMA(data, slowPeriod);
    
    const macdLine = emaFast.map((fast, i) => ({
      date: fast.date,
      value: fast.value - emaSlow[i].value
    }));
    
    const signalLine = calculateEMA(macdLine.map(d => ({ date: d.date, price: d.value })), signalPeriod);
    const histogram = macdLine.map((macd, i) => ({
      date: macd.date,
      value: macd.value - (signalLine[i]?.value || 0)
    }));
    
    return { macdLine, signalLine, histogram };
  }

  function calculateBollingerBands(data: ChartData[], period: number, stdDev: number) {
    if (data.length < period) return [];
    const sma = calculateSMA(data, period);
    const bands = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = slice.reduce((acc, d) => acc + d.price, 0) / period;
      const variance = slice.reduce((acc, d) => acc + Math.pow(d.price - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      bands.push({
        date: data[i].date,
        upper: mean + (standardDeviation * stdDev),
        middle: mean,
        lower: mean - (standardDeviation * stdDev)
      });
    }
    return bands;
  }

  function prepareChartDataWithIndicators(data: ChartData[]) {
    if (!data || data.length === 0) return data;
    
    const chartData = [...data];
    
    if (indicators.sma.enabled) {
      const smaData = calculateSMA(data, indicators.sma.period);
      const smaMap = new Map(smaData.map(d => [d.date, d.value]));
      chartData.forEach(d => {
        if (smaMap.has(d.date)) {
          (d as any).sma = smaMap.get(d.date);
        }
      });
    }
    
    if (indicators.ema.enabled) {
      const emaData = calculateEMA(data, indicators.ema.period);
      const emaMap = new Map(emaData.map(d => [d.date, d.value]));
      chartData.forEach(d => {
        if (emaMap.has(d.date)) {
          (d as any).ema = emaMap.get(d.date);
        }
      });
    }
    
    if (indicators.bollinger.enabled) {
      const bbData = calculateBollingerBands(data, indicators.bollinger.period, indicators.bollinger.stdDev);
      const bbMap = new Map(bbData.map(d => [d.date, d]));
      chartData.forEach(d => {
        if (bbMap.has(d.date)) {
          const bb = bbMap.get(d.date)!;
          (d as any).bbUpper = bb.upper;
          (d as any).bbMiddle = bb.middle;
          (d as any).bbLower = bb.lower;
        }
      });
    }
    
    return chartData;
  }

  if (loading || !selectedStock) {
    return (
      <div className="relative min-h-screen">
        <Component />
        <div className="relative z-10 p-8">
          <div className="flex justify-between items-start mb-8">
            <h1 className="text-white text-4xl font-bold animate-fade-in">Stocked</h1>
          </div>
          <div className="flex justify-center items-center h-96">
            <div className="text-white text-2xl font-medium">
              Loading
              <span className="inline-block w-8 text-left">
                <span className="animate-pulse">.</span>
                <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Component />
      <div className="relative z-10 p-8">
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-white text-4xl font-bold animate-fade-in">Stocked</h1>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <Select value={selectedStock.symbol} onValueChange={(val) => { setPrimaryFilter(""); setPrimaryActiveIdx(0); setPrimaryShowAll(false); handleStockChange(val); }}>
              <SelectTrigger className="bg-transparent text-white border-none focus:ring-2 focus:ring-white/20 w-64">
                <SelectValue placeholder="Select stock" />
              </SelectTrigger>
              <SelectContent
                className="bg-gray-800 border-white/20"
                onKeyDown={(e) => {
                  const q = primaryFilter.trim();
                  const base = (stocks || []);
                  const filtered = q
                    ? base
                        .map((s) => ({ ...s, __score: scoreStock(q, s) }))
                        .filter((s: any) => s.__score >= 0)
                        .sort((a: any, b: any) => b.__score - a.__score)
                    : base;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setPrimaryActiveIdx((i) => Math.min(i + 1, Math.max(0, (primaryShowAll ? filtered.length : Math.min(filtered.length, 20)) - 1)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setPrimaryActiveIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    const list = primaryShowAll ? filtered : filtered.slice(0, 20);
                    const item = list[primaryActiveIdx];
                    if (item) {
                      handleStockChange(item.symbol);
                      setPrimaryFilter("");
                      setPrimaryActiveIdx(0);
                      setPrimaryShowAll(false);
                    }
                  }
                }}
                onKeyDownCapture={(e) => {
                  const t = e.target as HTMLElement;
                  if (t && t.dataset && (t as any).dataset.role === 'select-search') {
                    e.stopPropagation();
                  }
                }}
                onPointerDown={(e) => {
                  const t = e.target as HTMLElement;
                  if (t && t.dataset && (t as any).dataset.role === 'select-search') {
                    e.stopPropagation();
                  }
                }}
              >
                <div className="px-2 pb-2">
                  <input
                    data-role="select-search"
                    autoFocus
                    placeholder="Search symbol or name..."
                    value={primaryFilter}
                    onChange={(e) => { setPrimaryFilter(e.target.value); setPrimaryActiveIdx(0); setPrimaryShowAll(false); }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1.5 rounded-md bg-gray-700 text-white placeholder:text-gray-400 text-sm outline-none border border-white/10 focus:border-white/30"
                  />
                </div>
                {(() => {
                  const q = primaryFilter.trim();
                  const base = (stocks || []);
                  const filtered = q
                    ? base
                        .map((s) => ({ ...s, __score: scoreStock(q, s) }))
                        .filter((s: any) => s.__score >= 0)
                        .sort((a: any, b: any) => b.__score - a.__score)
                    : base;
                  const limited = primaryShowAll ? filtered : filtered.slice(0, 20);

                  if (limited.length === 0) {
                    return <div className="px-3 py-2 text-sm text-gray-400">No results</div>;
                  }

                  return (
                    <>
                      {limited.map((stock: any, idx: number) => {
                        const isCustomStock = !stockSymbols.includes(stock.symbol);
                        const isActive = idx === primaryActiveIdx;
                        return (
                          <div key={stock.symbol} className={`flex items-center justify-between px-2 py-1.5 rounded-sm ${isActive ? "bg-white/15" : "hover:bg-white/10"}`}>
                            <SelectItem value={stock.symbol} className="text-white focus:bg-transparent hover:!text-white flex-1">
                              <div className="flex gap-2">
                                <span className="font-semibold">{highlight(stock.symbol, q)}</span>
                                <span className="text-white/70">- {highlight(stock.name, q)}</span>
                              </div>
                            </SelectItem>
                            {isCustomStock && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeCustomStock(stock.symbol);
                                }}
                                className="ml-2 text-red-400 hover:text-red-300 text-xs px-1 py-0.5 rounded"
                                title="Remove custom stock"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {filtered.length > 20 && !primaryShowAll && (
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPrimaryShowAll(true); }}
                        >
                          Show all ({filtered.length})
                        </button>
                      )}
                    </>
                  );
                })()}
                <SelectSeparator className="bg-white/20" />
                <SelectItem value="add-custom" className="text-white focus:bg-white/10 hover:!text-white">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Custom Stock
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <Select value={compareSymbol ?? ""} onValueChange={(sym) => { 
              if (sym === "add-custom") { setCompareFilter(""); setCompareActiveIdx(0); setCompareShowAll(false); setModalOpen(true); return; }
              setCompareOn(true); 
              setCompareSymbol(sym); 
              setCompareFilter("");
              setCompareActiveIdx(0);
              setCompareShowAll(false);
            }}>
              <SelectTrigger className="bg-transparent text-white border-none focus:ring-2 focus:ring-white/20 w-64">
                <SelectValue placeholder="Compare stock" />
              </SelectTrigger>
              <SelectContent
                className="bg-gray-800 border-white/20"
                onKeyDown={(e) => {
                  const q = compareFilter.trim();
                  const base = (stocks || []);
                  const filtered = q
                    ? base
                        .map((s) => ({ ...s, __score: scoreStock(q, s) }))
                        .filter((s: any) => s.__score >= 0)
                        .sort((a: any, b: any) => b.__score - a.__score)
                    : base;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCompareActiveIdx((i) => Math.min(i + 1, Math.max(0, (compareShowAll ? filtered.length : Math.min(filtered.length, 20)) - 1)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCompareActiveIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    const list = compareShowAll ? filtered : filtered.slice(0, 20);
                    const item = list[compareActiveIdx];
                    if (item) {
                      setCompareOn(true);
                      setCompareSymbol(item.symbol);
                      setCompareFilter("");
                      setCompareActiveIdx(0);
                      setCompareShowAll(false);
                    }
                  }
                }}
                onKeyDownCapture={(e) => {
                  const t = e.target as HTMLElement;
                  if (t && t.dataset && (t as any).dataset.role === 'select-search') {
                    e.stopPropagation();
                  }
                }}
                onPointerDown={(e) => {
                  const t = e.target as HTMLElement;
                  if (t && t.dataset && (t as any).dataset.role === 'select-search') {
                    e.stopPropagation();
                  }
                }}
              >
                <div className="px-2 pb-2">
                  <input
                    data-role="select-search"
                    autoFocus
                    placeholder="Search symbol or name..."
                    value={compareFilter}
                    onChange={(e) => { setCompareFilter(e.target.value); setCompareActiveIdx(0); setCompareShowAll(false); }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1.5 rounded-md bg-gray-700 text-white placeholder:text-gray-400 text-sm outline-none border border-white/10 focus:border-white/30"
                  />
                </div>
                {(() => {
                  const q = compareFilter.trim();
                  const base = (stocks || []);
                  const filtered = q
                    ? base
                        .map((s) => ({ ...s, __score: scoreStock(q, s) }))
                        .filter((s: any) => s.__score >= 0)
                        .sort((a: any, b: any) => b.__score - a.__score)
                    : base;
                  const limited = compareShowAll ? filtered : filtered.slice(0, 20);

                  if (limited.length === 0) {
                    return <div className="px-3 py-2 text-sm text-gray-400">No results</div>;
                  }

                  return (
                    <>
                      {limited.map((stock: any, idx: number) => {
                        const isCustomStock = !stockSymbols.includes(stock.symbol);
                        const isActive = idx === compareActiveIdx;
                        return (
                          <div key={stock.symbol} className={`flex items-center justify-between px-2 py-1.5 rounded-sm ${isActive ? "bg-white/15" : "hover:bg-white/10"}`}>
                            <SelectItem value={stock.symbol} className="text-white focus:bg-transparent hover:!text-white flex-1">
                              <div className="flex gap-2">
                                <span className="font-semibold">{highlight(stock.symbol, q)}</span>
                                <span className="text-white/70">- {highlight(stock.name, q)}</span>
                              </div>
                            </SelectItem>
                            {isCustomStock && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeCustomStock(stock.symbol);
                                  if (compareSymbol === stock.symbol) { setCompareOn(false); setCompareSymbol(null); }
                                }}
                                className="ml-2 text-red-400 hover:text-red-300 text-xs px-1 py-0.5 rounded"
                                title="Remove custom stock"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {filtered.length > 20 && !compareShowAll && (
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCompareShowAll(true); }}
                        >
                          Show all ({filtered.length})
                        </button>
                      )}
                    </>
                  );
                })()}
                <SelectSeparator className="bg-white/20" />
                <SelectItem value="add-custom" className="text-white focus:bg-white/10 hover:!text-white">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Custom Stock
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          

          <Dialog open={modalOpen} onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              setSearchQuery("");
              setSearchResults([]);
            }
          }}>
            <DialogContent className="bg-gray-800 border-white/20 text-white">
              <DialogHeader>
                <DialogTitle>Add Custom Stock</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="stock-input" className="block text-sm font-medium mb-2">
                    Search or Enter Stock Symbol
                  </label>
                  <Input
                    id="stock-input"
                    type="text"
                    placeholder="Search for company name or enter symbol (e.g., Apple, AAPL, TSLA)..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="bg-gray-700 border-white/20 text-white placeholder:text-gray-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomStock()}
                  />
                  {isSearching && (
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mt-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Searching stocks...</span>
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-white/20 rounded-md">
                      {searchResults.map((result) => (
                        <button
                          key={result.symbol}
                          onClick={() => selectSearchResult(result.symbol)}
                          className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm border-b border-white/10 last:border-b-0"
                        >
                          <div className="font-medium">{result.symbol}</div>
                          <div className="text-gray-400 text-xs">{result.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <ButtonCta
                  onClick={handleAddCustomStock}
                  disabled={isAddingStock || !customStockSymbol.trim()}
                  label={isAddingStock ? "Adding Stock..." : "Add Stock"}
                />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="text-center mb-6">
          <div className="text-white text-5xl font-bold"><span className="text-white/60 mr-1">$</span>{selectedStock.price.toFixed(2)}</div>
        </div>

        {!isMarketOpen && (
          <div className="text-center mb-4">
            <div className="text-red-400 text-sm">The market is closed.</div>
          </div>
        )}
        <div className="flex justify-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 w-full max-w-7xl h-96 flex">
            <div className="w-56 border-r border-white/10 p-4 flex flex-col gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Chart Type</div>
                <div className="flex gap-2">
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm ${chartType === 'line' ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                    onClick={() => setChartType('line')}
                  >
                    Line
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm ${chartType === 'area' ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                    onClick={() => setChartType('area')}
                  >
                    Area
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm ${chartType === 'bar' ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                    onClick={() => setChartType('bar')}
                  >
                    Bar
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Range</div>
                <div className="flex gap-2">
                  <button
                    className={`px-2.5 py-1.5 rounded-md text-sm ${daysRange === 7 ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                    onClick={() => setDaysRange(7)}
                  >
                    7D
                  </button>
                  <button
                    className={`px-2.5 py-1.5 rounded-md text-sm ${daysRange === 30 ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                    onClick={() => setDaysRange(30)}
                  >
                    30D
                  </button>
                  <button
                    className={`px-2.5 py-1.5 rounded-md text-sm ${daysRange === 90 ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                    onClick={() => setDaysRange(90)}
                  >
                    90D
                  </button>
                </div>
                <div className="pt-2">
                  <button
                    className="mt-2 w-full px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => setCustomRangeOpen(true)}
                  >
                    Custom Range
                  </button>
                  <div 
                    className="mt-2 w-full px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 text-white cursor-pointer flex items-center justify-between"
                    onClick={() => {
                      setShowAdvanced(!showAdvanced);
                      if (!showAdvanced) {
                        setShowIPOs(false);
                      }
                    }}
                  >
                    <span>Advanced</span>
                    <span className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>
                {showAdvanced && (
                  <div className="pt-2 border-t border-white/10">
                    <button
                      className="mt-2 w-full px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 text-white"
                      onClick={() => {
                        setShowIPOs(!showIPOs);
                        if (!showIPOs && ipos.length === 0) {
                          fetchIPOs();
                        }
                      }}
                    >
                      {showIPOs ? 'Hide IPOs' : 'View IPOs'}
                    </button>

                  </div>
                )}

              </div>
            </div>
            <div className="flex-1 p-8 relative">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={mergeForCompare(prepareChartDataWithIndicators(chartData), compareOn ? prepareChartDataWithIndicators(compareChartData) : [])}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.6)" 
                      fontSize={12}
                      tick={{ fill: 'rgba(255,255,255,0.6)' }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.6)" 
                      fontSize={12}
                      tick={{ fill: 'rgba(255,255,255,0.6)' }}
                      domain={['dataMin - 10', 'dataMax + 10']}
                      tickFormatter={(value) => roundToNearestFive(value).toString()}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value: any, name: any) => [
                        typeof value === 'number' ? value.toFixed(2) : value,
                        name
                      ]}
                    />
                    <Area type="monotone" dataKey="p1" name={selectedStock?.symbol ?? ''} stroke="#B873F8" fill="#B873F8" fillOpacity={0.2} strokeWidth={2} />
                    {compareOn && compareSymbol && (
                      <Area type="monotone" dataKey="p2" name={compareSymbol} stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.15} strokeWidth={2} />
                    )}
                    {indicators.sma.enabled && (
                      <Line type="monotone" dataKey="sma" name={`SMA ${indicators.sma.period}`} stroke="#FFD700" strokeWidth={1} dot={false} />
                    )}
                    {indicators.ema.enabled && (
                      <Line type="monotone" dataKey="ema" name={`EMA ${indicators.ema.period}`} stroke="#FF6B6B" strokeWidth={1} dot={false} />
                    )}
                    {indicators.bollinger.enabled && (
                      <>
                        <Line type="monotone" dataKey="bbUpper" name="BB Upper" stroke="#00FF00" strokeWidth={1} dot={false} />
                        <Line type="monotone" dataKey="bbMiddle" name="BB Middle" stroke="#FFA500" strokeWidth={1} dot={false} />
                        <Line type="monotone" dataKey="bbLower" name="BB Lower" stroke="#00FF00" strokeWidth={1} dot={false} />
                      </>
                    )}
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={mergeForCompare(prepareChartDataWithIndicators(chartData), compareOn ? prepareChartDataWithIndicators(compareChartData) : [])}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.6)" 
                      fontSize={12}
                      tick={{ fill: 'rgba(255,255,255,0.6)' }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.6)" 
                      fontSize={12}
                      tick={{ fill: 'rgba(255,255,255,0.6)' }}
                      domain={['dataMin - 10', 'dataMax + 10']}
                      tickFormatter={(value) => roundToNearestFive(value).toString()}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value: any, name: any) => [
                        typeof value === 'number' ? value.toFixed(2) : value,
                        name
                      ]}
                    />
                    <Bar dataKey="p1" name={selectedStock?.symbol ?? ''} fill="#B873F8">
                      {mergeForCompare(prepareChartDataWithIndicators(chartData), compareOn ? prepareChartDataWithIndicators(compareChartData) : []).map((entry: any, index: number) => {
                        let color = '#B873F8';
                        const currentValue = entry.p1;
                        
                        if (index === 0 && previousPrice !== null) {
                          if (currentValue > previousPrice) color = '#10B981';
                          else if (currentValue < previousPrice) color = '#EF4444';
                        } else if (index > 0) {
                          const previousValue = mergeForCompare(prepareChartDataWithIndicators(chartData), compareOn ? prepareChartDataWithIndicators(compareChartData) : [])[index - 1]?.p1;
                          if (currentValue > previousValue) color = '#10B981';
                          else if (currentValue < previousValue) color = '#EF4444';
                        }
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                    {compareOn && compareSymbol && (
                      <Bar dataKey="p2" name={compareSymbol} fill="#22D3EE">
                        {mergeForCompare(prepareChartDataWithIndicators(chartData), compareOn ? prepareChartDataWithIndicators(compareChartData) : []).map((entry: any, index: number) => {
                          let color = '#22D3EE';
                          const currentValue = entry.p2;
                          
                          if (index === 0 && comparePreviousPrice !== null) {
                            if (currentValue > comparePreviousPrice) color = '#10B981';
                            else if (currentValue < comparePreviousPrice) color = '#EF4444';
                          } else if (index > 0) {
                            const previousValue = mergeForCompare(prepareChartDataWithIndicators(chartData), compareOn ? prepareChartDataWithIndicators(compareChartData) : [])[index - 1]?.p2;
                            if (currentValue > previousValue) color = '#10B981';
                            else if (currentValue < previousValue) color = '#EF4444';
                          }
                          return <Cell key={`cell-compare-${index}`} fill={color} />;
                        })}
                      </Bar>
                    )}
                    {indicators.sma.enabled && (
                      <Line type="monotone" dataKey="sma" name={`SMA ${indicators.sma.period}`} stroke="#FFD700" strokeWidth={1} dot={false} />
                    )}
                    {indicators.ema.enabled && (
                      <Line type="monotone" dataKey="ema" name={`EMA ${indicators.ema.period}`} stroke="#FF6B6B" strokeWidth={1} dot={false} />
                    )}
                    {indicators.bollinger.enabled && (
                      <>
                        <Line type="monotone" dataKey="bbUpper" name="BB Upper" stroke="#00FF00" strokeWidth={1} dot={false} />
                        <Line type="monotone" dataKey="bbMiddle" name="BB Middle" stroke="#FFA500" strokeWidth={1} dot={false} />
                        <Line type="monotone" dataKey="bbLower" name="BB Lower" stroke="#00FF00" strokeWidth={1} dot={false} />
                      </>
                    )}
                  </BarChart>
                                  ) : (
                    <LineChart data={mergeForCompare(prepareChartDataWithIndicators(chartData), compareOn ? prepareChartDataWithIndicators(compareChartData) : [])}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date"
                      stroke="rgba(255,255,255,0.6)" 
                      fontSize={12}
                      tick={{ fill: 'rgba(255,255,255,0.6)' }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.6)" 
                      fontSize={12}
                      tick={{ fill: 'rgba(255,255,255,0.6)' }}
                      domain={['dataMin - 10', 'dataMax + 10']}
                      tickFormatter={(value) => roundToNearestFive(value).toString()}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white' }}
                      formatter={(value: any, name: any) => [
                        typeof value === 'number' ? value.toFixed(2) : value,
                        name
                      ]}
                    />
                    <Line type="monotone" dataKey="p1" name={selectedStock?.symbol ?? ""} stroke="#B873F8" strokeWidth={2} dot={false} />
                    {compareOn && compareSymbol && (
                      <Line type="monotone" dataKey="p2" name={compareSymbol} stroke="#22D3EE" strokeWidth={2} dot={false} />
                    )}
                    {indicators.sma.enabled && (
                      <Line type="monotone" dataKey="sma" name={`SMA ${indicators.sma.period}`} stroke="#FFD700" strokeWidth={1} dot={false} />
                    )}
                    {indicators.ema.enabled && (
                      <Line type="monotone" dataKey="ema" name={`EMA ${indicators.ema.period}`} stroke="#FF6B6B" strokeWidth={1} dot={false} />
                    )}
                    {indicators.bollinger.enabled && (
                      <>
                        <Line type="monotone" dataKey="bbUpper" name="BB Upper" stroke="#00FF00" strokeWidth={1} dot={false} />
                        <Line type="monotone" dataKey="bbMiddle" name="BB Middle" stroke="#FFA500" strokeWidth={1} dot={false} />
                        <Line type="monotone" dataKey="bbLower" name="BB Lower" stroke="#00FF00" strokeWidth={1} dot={false} />
                      </>
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
              {compareOn && compareSymbol && (
                <div className="mt-3 flex items-center gap-4 text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#B873F8' }} />
                    <span>{selectedStock?.symbol}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#22D3EE' }} />
                    <span>{compareSymbol}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className={`transition-all duration-300 ease-in-out ${showIPOs && showAdvanced ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
              <div className="w-80 border-l border-white/10 p-4 bg-white/5 h-full">
                <h3 className="text-white font-semibold mb-3 text-center">Upcoming IPOs</h3>
                {loadingIPOs ? (
                  <div className="text-white/60 text-sm text-center">Loading IPOs...</div>
                ) : ipos.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {ipos.map((ipo, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10">
                        <div>
                          <div className="text-white font-medium">{ipo.symbol}</div>
                          <div className="text-white/60 text-xs">{ipo.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white/80 text-sm">
                            {ipo.price.startsWith('$') ? (
                              <>
                                <span className="text-white/50">$</span>
                                {ipo.price.slice(1)}
                              </>
                            ) : (
                              ipo.price
                            )}
                          </div>
                          <div className="text-white/60 text-xs">{ipo.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-white/60 text-sm text-center">No upcoming IPOs found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={customRangeOpen} onOpenChange={setCustomRangeOpen}>
        <DialogContent className="bg-gray-800 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Select Custom Range</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              presets={[
                { label: "7D", days: 7 },
                { label: "30D", days: 30 },
                { label: "90D", days: 90 },
                { label: "YTD", days: Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000*60*60*24)) + 1 },
              ]}
              className="bg-transparent"
            />
            <p className="text-xs text-gray-400">Tip: Click a start day, then an end day. Or use a preset.</p>
          </div>

          <DialogFooter>
            <button
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm"
              onClick={() => setCustomRangeOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-white text-black text-sm"
              disabled={!dateRange.start || !dateRange.end || !selectedStock}
              onClick={async () => {
                if (!selectedStock || !dateRange.start || !dateRange.end) return;
                const start = dateRange.start;
                const end = dateRange.end;
                const diffMs = end.getTime() - start.getTime();
                const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
                const chart = await fetchStockChart(selectedStock.symbol, diffDays);
                setChartData(chart);
                setCustomRangeOpen(false);
              }}
            >
              Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 