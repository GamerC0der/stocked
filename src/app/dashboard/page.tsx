"use client";

import { Component } from "@/components/ui/bg-gradient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { ButtonCta } from "@/components/ui/button-shiny";
import { useState, useEffect } from "react";
import { fetchMultipleStocks, fetchStockChart, fetchStockQuote, watchlistDB, exportWatchlist, importWatchlist, fetchRecentIPOs, type StockData, type ChartData, type IPOData } from "@/lib/stock-api";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from "@/components/ui/toast";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Eye, EyeOff, TrendingUp, BarChart3, PieChart, Search, Sun, Moon, Download } from "lucide-react";
import DateRangePicker, { type DateRange } from "@/components/ui/date-range";

const stockSymbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "NFLX", "SPY", "QQQ"];

export default function Dashboard() {
  const { showToast } = useToast();
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  const [customStockSymbol, setCustomStockSymbol] = useState("");
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; source?: 'search' | 'watchlist' }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [daysRange, setDaysRange] = useState<30 | 90 | 1825>(30);
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
  const [ipos, setIpos] = useState<IPOData[]>([]);
  const [recentIPOs, setRecentIPOs] = useState<IPOData[]>([]);
  const [loadingIPOs, setLoadingIPOs] = useState(false);
  const [loadingRecentIPOs, setLoadingRecentIPOs] = useState(false);
  const [ipoView, setIpoView] = useState<'upcoming' | 'recent'>('upcoming');
  const [showTechnicalIndicators, setShowTechnicalIndicators] = useState(false);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [comparePreviousPrice, setComparePreviousPrice] = useState<number | null>(null);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [watchlist, setWatchlist] = useState<StockData[]>([]);
  const [watchlistPrices, setWatchlistPrices] = useState<{[key: string]: number}>({});
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchlistSearch, setWatchlistSearch] = useState("");
  const [includeWatchlistInSearch, setIncludeWatchlistInSearch] = useState(false);
  const [showSearchInterface, setShowSearchInterface] = useState(true);
  const [searchInterfaceQuery, setSearchInterfaceQuery] = useState("");
  const [searchInterfaceResults, setSearchInterfaceResults] = useState<{ symbol: string; name: string; source?: 'search' | 'watchlist' }[]>([]);
  const [isSearchInterfaceSearching, setIsSearchInterfaceSearching] = useState(false);
  const [indicators, setIndicators] = useState({
    rsi: { enabled: false, period: 14 },
    macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    bollinger: { enabled: false, period: 20, stdDev: 2 },
    sma: { enabled: false, period: 20 },
    ema: { enabled: false, period: 20 }
  });
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [marketIndices, setMarketIndices] = useState<{
    sp500: { symbol: string; price: number; change: number; changePercent: number };
    nasdaq: { symbol: string; price: number; change: number; changePercent: number };
  } | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const fetchMarketIndices = async () => {
    try {
      const [sp500Data, nasdaqData] = await Promise.all([
        fetchStockQuote('^GSPC'),
        fetchStockQuote('^IXIC')
      ]);
      
      if (sp500Data && nasdaqData) {
        setMarketIndices({
          sp500: {
            symbol: 'S&P 500',
            price: sp500Data.price,
            change: sp500Data.change,
            changePercent: sp500Data.changePercent
          },
          nasdaq: {
            symbol: 'NASDAQ',
            price: nasdaqData.price,
            change: nasdaqData.change,
            changePercent: nasdaqData.changePercent
          }
        });
      }
    } catch (error) {
    }
  };

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
          price: row.proposedSharePrice ? `$${row.proposedSharePrice}` : 'N/A',
          status: 'upcoming' as const
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

  const fetchRecentIPOsData = async () => {
    setLoadingRecentIPOs(true);
    try {
      const recentData = await fetchRecentIPOs();
      setRecentIPOs(recentData);
    } catch (error) {
      setRecentIPOs([]);
    } finally {
      setLoadingRecentIPOs(false);
    }
  };

  const loadWatchlist = async () => {
    try {
      const watchlistSymbols = await watchlistDB.getWatchlist();
      
      if (watchlistSymbols.length > 0) {
        setWatchlistLoading(true);
        const watchlistData = await fetchMultipleStocks(watchlistSymbols);
        setWatchlist(watchlistData);
        
        const prices: {[key: string]: number} = {};
        watchlistData.forEach(stock => {
          prices[stock.symbol] = stock.price;
        });
        setWatchlistPrices(prices);
        setWatchlistLoading(false);
      } else {
        setWatchlist([]);
        setWatchlistLoading(false);
      }
    } catch (error) {
      setWatchlist([]);
      setWatchlistLoading(false);
    }
  };

  const addToWatchlist = async (symbol: string) => {
    try {
      const stockData = await fetchStockQuote(symbol);
      if (stockData) {
        const updatedWatchlist = [...watchlist, stockData];
        setWatchlist(updatedWatchlist);
        setWatchlistPrices(prev => ({...prev, [symbol]: stockData.price}));
        
        await watchlistDB.addToWatchlist(symbol);
      }
    } catch (error) {
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    const updatedWatchlist = watchlist.filter(stock => stock.symbol !== symbol);
    setWatchlist(updatedWatchlist);
    
    const updatedPrices = {...watchlistPrices};
    delete updatedPrices[symbol];
    setWatchlistPrices(updatedPrices);
    
    await watchlistDB.removeFromWatchlist(symbol);
  };

  useEffect(() => {
    async function loadStocks() {
      setLoading(true);
      
      try {
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
        setSelectedStock(null);
        setChartData([]);
      } catch (error) {
        showToast('Failed to load stock data', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadStocks();
    loadWatchlist();
    fetchMarketIndices();
    
    const interval = setInterval(loadStocks, 30000);
    const marketInterval = setInterval(fetchMarketIndices, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(marketInterval);
    };
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
      try {
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
      } catch (error) {
        showToast('Failed to load chart data', 'error');
        setChartData([]);
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
      try {
        const chart = await fetchStockChart(symbol, daysRange);
        setChartData(chart);
      } catch (error) {
        showToast('Failed to load chart data', 'error');
        setChartData([]);
      }
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
        try {
          const chart = await fetchStockChart(stockData.symbol, daysRange);
          setChartData(chart);
        } catch (error) {
          showToast('Stock added but failed to load chart data', 'info');
          setChartData([]);
        }
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
        showToast(`Could not find stock data for ${originalSymbol}. Please check the symbol and try again.`, 'error');
      }
    } catch (error) {
      showToast("Error adding custom stock. Please try again.", 'error');
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
      
      let results = [];
      if (data.quotes) {
        results = data.quotes.map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          source: 'search'
        }));
      }

      if (includeWatchlistInSearch && watchlist.length > 0) {
        const watchlistResults = watchlist
          .filter(stock => 
            stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
            stock.name.toLowerCase().includes(query.toLowerCase())
          )
          .map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            source: 'watchlist'
          }));
        
        const allResults = [...watchlistResults, ...results];
        const seen = new Set();
        results = allResults.filter(item => {
          const key = item.symbol.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      setSearchResults(results);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCustomStockSymbol(query);
    searchStocks(query);
  };

  const selectSearchResult = (symbol: string) => {
    setCustomStockSymbol(symbol);
    setSearchQuery(symbol);
    setSearchResults([]);
  };

  const searchInterfaceSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchInterfaceResults([]);
      return;
    }

    setIsSearchInterfaceSearching(true);
    try {
      const response = await fetch(`https://corsproxy.io/?https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`);
      const data = await response.json();
      
      let results = [];
      if (data.quotes) {
        results = data.quotes.map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          source: 'search' as const
        }));
      }

      if (includeWatchlistInSearch && watchlist.length > 0) {
        const watchlistResults = watchlist
          .filter(stock => 
            stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
            stock.name.toLowerCase().includes(query.toLowerCase())
          )
          .map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            source: 'watchlist' as const
          }));
        
        const allResults = [...watchlistResults, ...results];
        const seen = new Set();
        results = allResults.filter(item => {
          const key = item.symbol.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      setSearchInterfaceResults(results);
    } catch (error) {
      setSearchInterfaceResults([]);
    } finally {
      setIsSearchInterfaceSearching(false);
    }
  };

  const handleSearchInterfaceChange = (query: string) => {
    setSearchInterfaceQuery(query);
    searchInterfaceSearch(query);
  };

  const selectSearchInterfaceResult = async (symbol: string) => {
    setShowSearchInterface(false);
    setSelectedStock(stocks.find(s => s.symbol === symbol) || null);
    if (symbol) {
      const chart = await fetchStockChart(symbol, daysRange);
      setChartData(chart);
    }
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

  const exportChartAsCSV = () => {
    if (!selectedStock || !chartData.length) return;
    
    const data = prepareChartDataWithIndicators(chartData);
    const headers = ['Date', 'Price'];
    const rows = [headers];
    
    data.forEach(item => {
      const row = [item.date, item.price.toString()];
      if (indicators.sma.enabled && (item as any).sma) row.push((item as any).sma.toString());
      if (indicators.ema.enabled && (item as any).ema) row.push((item as any).ema.toString());
      if (indicators.bollinger.enabled && (item as any).bbUpper) {
        row.push((item as any).bbUpper.toString());
        row.push((item as any).bbMiddle.toString());
        row.push((item as any).bbLower.toString());
      }
      rows.push(row);
    });
    
    if (indicators.sma.enabled) headers.push(`SMA ${indicators.sma.period}`);
    if (indicators.ema.enabled) headers.push(`EMA ${indicators.ema.period}`);
    if (indicators.bollinger.enabled) {
      headers.push('BB Upper', 'BB Middle', 'BB Lower');
    }
    
    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedStock.symbol}_chart_data_${daysRange}D.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Chart data exported as CSV', 'success');
  };

  const exportChartAsPDF = () => {
    if (!selectedStock || !chartData.length) return;
    
    try {
      const doc = new jsPDF();
      const data = prepareChartDataWithIndicators(chartData);
      
      doc.setFontSize(16);
      doc.text(`${selectedStock.symbol} Stock Chart - ${daysRange} Days`, 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Current Price: $${selectedStock.price.toFixed(2)}`, 20, 35);
      
      const startDate = data[0]?.date || '';
      const endDate = data[data.length - 1]?.date || '';
      doc.text(`Date Range: ${startDate} to ${endDate}`, 20, 45);
      
      doc.setFontSize(10);
      const headers = ['Date', 'Price'];
      if (indicators.sma.enabled) headers.push(`SMA ${indicators.sma.period}`);
      if (indicators.ema.enabled) headers.push(`EMA ${indicators.ema.period}`);
      if (indicators.bollinger.enabled) {
        headers.push('BB Upper', 'BB Middle', 'BB Lower');
      }
      
      const tableData = data.slice(-20).map(item => {
        const row = [item.date, item.price.toString()];
        if (indicators.sma.enabled && (item as any).sma) row.push((item as any).sma.toString());
        if (indicators.ema.enabled && (item as any).ema) row.push((item as any).ema.toString());
        if (indicators.bollinger.enabled && (item as any).bbUpper) {
          row.push((item as any).bbUpper.toString());
          row.push((item as any).bbMiddle.toString());
          row.push((item as any).bbLower.toString());
        }
        return row;
      });
      
      (doc as any).autoTable({
        head: [headers],
        body: tableData,
        startY: 60,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [75, 75, 75] }
      });
      
      doc.save(`${selectedStock.symbol}_chart_report_${daysRange}D.pdf`);
      showToast('Chart exported as PDF', 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      showToast('Failed to export PDF. Please try again.', 'error');
    }
  };

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

  if (loading) {
    return (
      <div className={`relative min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Component />
        <div className="relative z-10 p-8">
          <div className="flex justify-between items-start mb-8">
            <h1 className={`text-4xl font-bold animate-fade-in ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-green-500">$</span>tocked
            </h1>
          </div>
          <div className="flex justify-center items-center h-96">
            <div className={`text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
    <div className={`relative min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Component />
      <div className="relative z-10 p-8 overflow-x-auto">
        <div className="flex justify-between items-start mb-8">
          <h1 className={`text-4xl font-bold animate-fade-in ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-green-500">$</span>tocked
          </h1>
          
          <div className={`${isDarkMode ? 'bg-white/10' : 'bg-gray-800/90'} backdrop-blur-sm rounded-lg border ${isDarkMode ? 'border-white/20' : 'border-gray-700'} transition-colors duration-300`}>
            <Select value={selectedStock?.symbol || ""} onValueChange={(val) => {
              if (val === "add-custom") {
                setModalOpen(true);
                return;
              }
              handleStockChange(val);
            }}>
              <SelectTrigger className={`bg-transparent border-none focus:ring-2 w-64 transition-colors duration-300 ${isDarkMode ? 'text-white focus:ring-white/20' : 'text-gray-900 focus:ring-gray-600'}`}>
                <SelectValue placeholder="Select stock" />
              </SelectTrigger>
              <SelectContent className={`${isDarkMode ? 'bg-gray-800 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors duration-300`}>
                {stocks.map((stock) => (
                  <SelectItem key={stock.symbol} value={stock.symbol} className={`${isDarkMode ? 'text-white focus:bg-white/20 hover:bg-white/10' : 'text-gray-900 focus:bg-gray-100 hover:bg-gray-50'} transition-colors duration-300`}>
                    <div className="flex gap-2">
                      <span className="font-semibold">{stock.symbol}</span>
                      <span className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>- {stock.name}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectSeparator className={isDarkMode ? 'bg-white/20' : 'bg-gray-300'} />
                <SelectItem value="add-custom" className={`${isDarkMode ? 'text-white focus:bg-white/10 hover:!text-white' : 'text-gray-900 focus:bg-gray-100 hover:!text-gray-900'} transition-colors duration-300`}>
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Custom Stock
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={`${isDarkMode ? 'bg-white/10' : 'bg-gray-800/90'} backdrop-blur-sm rounded-lg border ${isDarkMode ? 'border-white/20' : 'border-gray-700'} transition-colors duration-300`}>
            <Select value={compareSymbol ?? ""} onValueChange={(sym) => { 
              if (sym === "add-custom") { 
                setModalOpen(true); 
                return; 
              }
              setCompareOn(true); 
              setCompareSymbol(sym); 
            }}>
              <SelectTrigger className={`bg-transparent border-none focus:ring-2 w-64 transition-colors duration-300 ${isDarkMode ? 'text-white focus:ring-white/20' : 'text-gray-900 focus:ring-gray-600'}`}>
                <SelectValue placeholder="Compare stock" />
              </SelectTrigger>
              <SelectContent className={`${isDarkMode ? 'bg-gray-800 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors duration-300`}>
                {stocks.map((stock) => (
                  <SelectItem key={stock.symbol} value={stock.symbol} className={`${isDarkMode ? 'text-white focus:bg-white/20 hover:bg-white/10' : 'text-gray-900 focus:bg-gray-100 hover:bg-gray-50'} transition-colors duration-300`}>
                    <div className="flex gap-2">
                      <span className="font-semibold">{stock.symbol}</span>
                      <span className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>- {stock.name}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectSeparator className={isDarkMode ? 'bg-white/20' : 'bg-gray-300'} />
                <SelectItem value="add-custom" className={`${isDarkMode ? 'text-white focus:bg-white/10 hover:!text-white' : 'text-gray-900 focus:bg-gray-100 hover:!text-gray-900'} transition-colors duration-300`}>
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
                  <div className="flex gap-2">
                    <SearchInput
                      id="stock-input"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onClear={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      loading={isSearching}
                      placeholder="Search for company name or enter symbol (e.g., Apple, AAPL, TSLA)..."
                      variant="default"
                      size="md"
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomStock()}
                    />
                    <button
                      onClick={() => setIncludeWatchlistInSearch(!includeWatchlistInSearch)}
                      className={`px-3 py-2 rounded-md text-sm border transition-colors flex items-center gap-1 ${
                        includeWatchlistInSearch 
                          ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' 
                          : isDarkMode 
                            ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                            : 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300'
                      }`}
                      title="Include watchlist in search"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                  {isSearching && (
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mt-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Searching stocks...</span>
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className={`mt-2 max-h-40 overflow-y-auto border rounded-md backdrop-blur-sm transition-colors duration-300 ${
                      isDarkMode 
                        ? 'border-white/20 bg-white/5' 
                        : 'border-gray-300 bg-white/80'
                    }`}>
                      {searchResults.map((result) => (
                        <button
                          key={result.symbol}
                          onClick={() => selectSearchResult(result.symbol)}
                          className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 transition-all duration-200 hover:shadow-sm ${
                            isDarkMode 
                              ? 'hover:bg-white/10 border-white/10 text-white' 
                              : 'hover:bg-gray-100 border-gray-200 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{result.symbol}</div>
                              <div className={isDarkMode ? 'text-white/60' : 'text-gray-600'}>{result.name}</div>
                            </div>
                            {result.source === 'watchlist' && (
                              <div className="text-blue-400 text-xs bg-blue-500/20 px-2 py-1 rounded-md">
                                WL
                              </div>
                            )}
                          </div>
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

        {selectedStock ? (
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className={`text-5xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <span className={`${isDarkMode ? 'text-white/60' : 'text-gray-600'} mr-1`}>$</span>{selectedStock.price.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Find a Stock</div>
            <div className={`${isDarkMode ? 'text-white/60' : 'text-gray-600'} text-lg`}>Select the stock at the top.</div>
          </div>
        )}

        {!isMarketOpen && (
          <div className="text-center mb-4">
            <div className="text-red-400 text-sm">The market is closed.</div>
          </div>
        )}
        <div className="flex justify-center">
          <div className={`backdrop-blur-sm rounded-lg border w-full max-w-7xl min-w-[800px] h-96 flex relative transition-colors duration-300 overflow-hidden ${
            isDarkMode 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/80 border-gray-300'
          }`}>
            {!selectedStock && (
              <div className={`absolute inset-0 backdrop-blur-sm flex items-center justify-center z-10 transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-900/95' : 'bg-gray-100/95'
              }`}>
                <div className="text-center">
                  <div className={`text-2xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No Stock Selected</div>
                  <div className={`backdrop-blur-sm rounded-lg border inline-block transition-colors duration-300 ${
                    isDarkMode ? 'bg-white/10 border-white/20' : 'bg-white/80 border-gray-300'
                  }`}>
                    <Select value="" onValueChange={(val) => {
                      if (val === "add-custom") {
                        setModalOpen(true);
                        return;
                      }
                      handleStockChange(val);
                    }}>
                      <SelectTrigger className={`bg-transparent border-none focus:ring-2 w-64 transition-colors duration-300 ${
                        isDarkMode ? 'text-white focus:ring-white/20' : 'text-gray-900 focus:ring-gray-600'
                      }`}>
                        <SelectValue placeholder="Select a stock to view" />
                      </SelectTrigger>
                      <SelectContent className={`${isDarkMode ? 'bg-gray-800 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors duration-300`}>
                        {stocks.map((stock) => (
                          <SelectItem key={stock.symbol} value={stock.symbol} className={`${isDarkMode ? 'text-white focus:bg-white/20 hover:bg-white/10' : 'text-gray-900 focus:bg-gray-100 hover:bg-gray-50'} transition-colors duration-300`}>
                            <div className="flex gap-2">
                              <span className="font-semibold">{stock.symbol}</span>
                              <span className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>- {stock.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectSeparator className={isDarkMode ? 'bg-white/20' : 'bg-gray-300'} />
                        <SelectItem value="add-custom" className={`${isDarkMode ? 'text-white focus:bg-white/10 hover:!text-white' : 'text-gray-900 focus:bg-gray-100 hover:!text-gray-900'} transition-colors duration-300`}>
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Custom Stock
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            {selectedStock && (
              <>
              <div className={`w-56 border-r p-4 flex flex-col gap-4 backdrop-blur-sm transition-colors duration-300 overflow-y-auto ${
                isDarkMode 
                  ? 'border-white/10 bg-white/5' 
                  : 'border-gray-300 bg-gray-50/80'
              }`}>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Chart Type
                </div>
                <div className="flex gap-2">
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm transition-all duration-200 flex items-center gap-1 ${
                      chartType === 'line' 
                        ? isDarkMode ? 'bg-white/20 text-white shadow-sm' : 'bg-gray-800 text-white shadow-sm'
                        : isDarkMode ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                    onClick={() => setChartType('line')}
                  >
                    <TrendingUp className="h-3 w-3" />
                    Line
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm transition-all duration-200 flex items-center gap-1 ${
                      chartType === 'area' 
                        ? isDarkMode ? 'bg-white/20 text-white shadow-sm' : 'bg-gray-800 text-white shadow-sm'
                        : isDarkMode ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                    onClick={() => setChartType('area')}
                  >
                    <PieChart className="h-3 w-3" />
                    Area
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm transition-all duration-200 flex items-center gap-1 ${
                      chartType === 'bar' 
                        ? isDarkMode ? 'bg-white/20 text-white shadow-sm' : 'bg-gray-800 text-white shadow-sm'
                        : isDarkMode ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                    onClick={() => setChartType('bar')}
                  >
                    <BarChart3 className="h-3 w-3" />
                    Bar
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Time Range</div>
                <div className="flex gap-2">
                  <button
                    className={`px-2.5 py-1.5 rounded-md text-sm transition-all duration-200 ${
                      daysRange === 30 
                        ? isDarkMode ? 'bg-white/20 text-white shadow-sm' : 'bg-gray-800 text-white shadow-sm'
                        : isDarkMode ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                    onClick={() => setDaysRange(30)}
                  >
                    30D
                  </button>
                  <button
                    className={`px-2.5 py-1.5 rounded-md text-sm transition-all duration-200 ${
                      daysRange === 90 
                        ? isDarkMode ? 'bg-white/20 text-white shadow-sm' : 'bg-gray-800 text-white shadow-sm'
                        : isDarkMode ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                    onClick={() => setDaysRange(90)}
                  >
                    90D
                  </button>
                  <button
                    className={`px-2.5 py-1.5 rounded-md text-sm transition-all duration-200 ${
                      daysRange === 1825 
                        ? isDarkMode ? 'bg-white/20 text-white shadow-sm' : 'bg-gray-800 text-white shadow-sm'
                        : isDarkMode ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                    onClick={() => setDaysRange(1825)}
                  >
                    MAX
                  </button>
                </div>
                <div className="pt-2 space-y-2">
                  <button
                    className={`w-full px-3 py-1.5 rounded-md text-sm transition-all duration-200 hover:shadow-sm ${
                      isDarkMode 
                        ? 'bg-white/10 hover:bg-white/20 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                    onClick={() => setCustomRangeOpen(true)}
                  >
                    Custom Range
                  </button>
                  <div 
                    className={`w-full px-3 py-1.5 rounded-md text-sm cursor-pointer flex items-center justify-between transition-all duration-200 hover:shadow-sm ${
                      isDarkMode 
                        ? 'bg-white/10 hover:bg-white/20 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
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
                  <button
                    className={`w-full px-3 py-1.5 rounded-md text-sm transition-all duration-200 hover:shadow-sm flex items-center gap-2 ${
                      isDarkMode 
                        ? 'bg-white/10 hover:bg-white/20 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                    onClick={() => setExportModalOpen(true)}
                    disabled={!selectedStock || !chartData.length}
                  >
                    <Download className="h-4 w-4" />
                    Export Chart
                  </button>
                </div>
                {showAdvanced && (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <button
                      className="w-full px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 transition-all duration-200 hover:shadow-sm"
                      onClick={() => {
                        setShowIPOs(!showIPOs);
                        setShowWatchlist(false);
                        if (!showIPOs) {
                          if (ipos.length === 0) {
                            fetchIPOs();
                          }
                          if (recentIPOs.length === 0) {
                            fetchRecentIPOsData();
                          }
                        }
                      }}
                    >
                      {showIPOs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showIPOs ? 'Hide IPOs' : 'View IPOs'}
                    </button>
                    <button
                      className="w-full px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:shadow-sm"
                      onClick={() => {
                        setShowWatchlist(!showWatchlist);
                        setShowIPOs(false);
                        if (!showWatchlist && watchlist.length === 0) {
                          loadWatchlist();
                        }
                      }}
                    >
                      {showWatchlist ? 'Hide Watchlist' : 'View Watchlist'}
                    </button>
                  </div>
                )}

              </div>
            </div>
            <div className="flex-1 p-8 relative">
              {selectedStock ? (
                <>
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
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Select a stock to view chart
                </div>
              )}
            </div>
          </>
          )}
            
            <div className={`transition-all duration-300 ease-in-out ${showIPOs ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
              <div className={`w-80 border-l p-4 h-full transition-colors duration-300 overflow-y-auto ${
                isDarkMode 
                  ? 'border-white/10 bg-white/5' 
                  : 'border-gray-300 bg-gray-50/80'
              }`}>
                <div className="flex mb-3">
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded-l-md transition-colors ${
                      ipoView === 'upcoming' 
                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-gray-800 text-white'
                        : isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    onClick={() => setIpoView('upcoming')}
                  >
                    Upcoming
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded-r-md transition-colors ${
                      ipoView === 'recent' 
                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-gray-800 text-white'
                        : isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    onClick={() => setIpoView('recent')}
                  >
                    Recent
                  </button>
                </div>
                
                {ipoView === 'upcoming' ? (
                  <>
                    {loadingIPOs ? (
                      <div className={`${isDarkMode ? 'text-white/60' : 'text-gray-600'} text-sm text-center`}>Loading IPOs...</div>
                    ) : ipos.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {ipos.map((ipo, index) => (
                          <div key={index} className={`flex justify-between items-center p-3 rounded border transition-colors duration-300 ${
                            isDarkMode 
                              ? 'bg-white/5 border-white/10' 
                              : 'bg-white/80 border-gray-200'
                          }`}>
                            <div>
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{ipo.symbol}</div>
                              <div className={isDarkMode ? 'text-white/60' : 'text-gray-600'}>{ipo.name}</div>
                            </div>
                            <div className="text-right">
                              <div className={`${isDarkMode ? 'text-white/80' : 'text-gray-700'} text-sm`}>
                                {ipo.price.startsWith('$') ? (
                                  <>
                                    <span className={isDarkMode ? 'text-white/50' : 'text-gray-500'}>$</span>
                                    {ipo.price.slice(1)}
                                  </>
                                ) : (
                                  ipo.price
                                )}
                              </div>
                              <div className={isDarkMode ? 'text-white/60' : 'text-gray-600'}>{ipo.date}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`${isDarkMode ? 'text-white/60' : 'text-gray-600'} text-sm text-center`}>No upcoming IPOs found</div>
                    )}
                  </>
                ) : (
                  <>
                    {loadingRecentIPOs ? (
                      <div className={`${isDarkMode ? 'text-white/60' : 'text-gray-600'} text-sm text-center`}>Loading recent IPOs...</div>
                    ) : recentIPOs.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {recentIPOs.map((ipo, index) => (
                          <div key={index} className={`flex justify-between items-center p-3 rounded border transition-colors duration-300 ${
                            isDarkMode 
                              ? 'bg-white/5 border-white/10' 
                              : 'bg-white/80 border-gray-200'
                          }`}>
                            <div className="flex-1">
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{ipo.symbol}</div>
                              <div className={isDarkMode ? 'text-white/60' : 'text-gray-600'}>{ipo.name}</div>
                              {ipo.exchange && ipo.exchange !== 'N/A' && (
                                <div className={isDarkMode ? 'text-white/50' : 'text-gray-500'}>{ipo.exchange}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`${isDarkMode ? 'text-white/80' : 'text-gray-700'} text-sm`}>
                                {ipo.price.startsWith('$') ? (
                                  <>
                                    <span className={isDarkMode ? 'text-white/50' : 'text-gray-500'}>$</span>
                                    {ipo.price.slice(1)}
                                  </>
                                ) : (
                                  ipo.price
                                )}
                              </div>
                              <div className={isDarkMode ? 'text-white/60' : 'text-gray-600'}>{ipo.date}</div>
                              {ipo.shares && ipo.shares !== 'N/A' && (
                                <div className={isDarkMode ? 'text-white/50' : 'text-gray-500'}>{ipo.shares} shares</div>
                              )}
                              {ipo.proceeds && ipo.proceeds !== 'N/A' && (
                                <div className={isDarkMode ? 'text-white/50' : 'text-gray-500'}>{ipo.proceeds}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`${isDarkMode ? 'text-white/60' : 'text-gray-600'} text-sm text-center`}>No recent IPOs found</div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className={`transition-all duration-300 ease-in-out ${showWatchlist ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
              <div className={`w-80 border-l p-4 h-full transition-colors duration-300 overflow-y-auto ${
                isDarkMode 
                  ? 'border-white/10 bg-white/5' 
                  : 'border-gray-300 bg-gray-50/80'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Watchlist</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={async () => {
                        try {
                          await exportWatchlist();
                          showToast('Watchlist exported successfully!', 'success');
                        } catch (error) {
                          showToast(error instanceof Error ? error.message : 'Error exporting watchlist', 'error');
                        }
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        isDarkMode 
                          ? 'bg-white/10 hover:bg-white/20 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      }`}
                      title="Export watchlist to CSV"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => document.getElementById('import-watchlist')?.click()}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        isDarkMode 
                          ? 'bg-white/10 hover:bg-white/20 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      }`}
                      title="Import watchlist from CSV"
                    >
                      Import
                    </button>
                  </div>
                </div>
                <input
                  id="import-watchlist"
                  type="file"
                  accept=".csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const result = await importWatchlist(file);
                        showToast(result.message, 'success');
                        loadWatchlist();
                      } catch (error) {
                        showToast(error instanceof Error ? error.message : 'Error importing watchlist', 'error');
                      }
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
                <div className="mb-3">
                  <SearchInput
                    value={watchlistSearch}
                    onChange={setWatchlistSearch}
                    onClear={() => setWatchlistSearch("")}
                    placeholder="Search watchlist..."
                    variant="default"
                    size="sm"
                    className="w-full"
                  />
                </div>
                {watchlistLoading ? (
                  <div className={`${isDarkMode ? 'text-white/60' : 'text-gray-600'} text-sm text-center`}>Loading watchlist...</div>
                ) : watchlist.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {watchlist
                      .filter(stock => 
                        stock.symbol.toLowerCase().includes(watchlistSearch.toLowerCase()) ||
                        stock.name.toLowerCase().includes(watchlistSearch.toLowerCase())
                      )
                      .map((stock, index) => (
                      <div key={index} className={`flex justify-between items-center p-3 rounded border transition-colors duration-300 ${
                        isDarkMode 
                          ? 'bg-white/5 border-white/10' 
                          : 'bg-white/80 border-gray-200'
                      }`}>
                        <div className="flex-1">
                          <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stock.symbol}</div>
                          <div className={isDarkMode ? 'text-white/60' : 'text-gray-600'}>{stock.name}</div>
                          <div className={`${isDarkMode ? 'text-white/80' : 'text-gray-700'} text-sm`}>${stock.price.toFixed(2)}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleStockChange(stock.symbol)}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              isDarkMode 
                                ? 'bg-white/10 hover:bg-white/20 text-white' 
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                            }`}
                          >
                            View
                          </button>
                          <button
                            onClick={() => removeFromWatchlist(stock.symbol)}
                            className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${isDarkMode ? 'text-white/60' : 'text-gray-600'} text-sm text-center`}>No stocks in watchlist</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Market Indices */}
      {marketIndices && (
        <div className="mt-6 flex justify-center">
          <div className={`backdrop-blur-sm rounded-lg border w-full max-w-7xl min-w-[800px] p-4 transition-colors duration-300 overflow-hidden ${
            isDarkMode 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/80 border-gray-300'
          }`}>
            <div className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
              Market Indices
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* S&P 500 */}
              <div className={`p-4 rounded-lg border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-white/5 border-white/10' 
                  : 'bg-white/60 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {marketIndices.sp500.symbol}
                    </div>
                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      ${marketIndices.sp500.price.toFixed(2)}
                    </div>
                  </div>
                  <div className={`text-right ${marketIndices.sp500.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <div className="text-lg font-semibold">
                      {marketIndices.sp500.change !== 0 ? (marketIndices.sp500.change >= 0 ? '+' : '') + marketIndices.sp500.change.toFixed(2) : ''}
                    </div>
                    <div className="text-sm">
                      {marketIndices.sp500.changePercent !== 0 ? (marketIndices.sp500.changePercent >= 0 ? '+' : '') + marketIndices.sp500.changePercent.toFixed(2) + '%' : ''}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* NASDAQ */}
              <div className={`p-4 rounded-lg border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-white/5 border-white/10' 
                  : 'bg-white/60 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {marketIndices.nasdaq.symbol}
                    </div>
                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      ${marketIndices.nasdaq.price.toFixed(2)}
                    </div>
                  </div>
                  <div className={`text-right ${marketIndices.nasdaq.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <div className="text-lg font-semibold">
                      {marketIndices.nasdaq.change !== 0 ? (marketIndices.nasdaq.change >= 0 ? '+' : '') + marketIndices.nasdaq.change.toFixed(2) : ''}
                    </div>
                    <div className="text-sm">
                      {marketIndices.nasdaq.changePercent !== 0 ? (marketIndices.nasdaq.changePercent >= 0 ? '+' : '') + marketIndices.nasdaq.changePercent.toFixed(2) + '%' : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="bg-gray-800 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Export Chart Data</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Choose export format for {selectedStock?.symbol}
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  exportChartAsCSV();
                  setExportModalOpen(false);
                }}
                className="flex items-center gap-3 p-4 rounded-lg border border-white/20 hover:bg-white/10 transition-colors text-left"
                disabled={!selectedStock || !chartData.length}
              >
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-400 font-bold">CSV</span>
                </div>
                <div>
                  <div className="font-medium">Export as CSV</div>
                  <div className="text-sm text-gray-400">Download chart data as spreadsheet</div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  exportChartAsPDF();
                  setExportModalOpen(false);
                }}
                className="flex items-center gap-3 p-4 rounded-lg border border-white/20 hover:bg-white/10 transition-colors text-left"
                disabled={!selectedStock || !chartData.length}
              >
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-red-400 font-bold">PDF</span>
                </div>
                <div>
                  <div className="font-medium">Export as PDF</div>
                  <div className="text-sm text-gray-400">Create detailed report with chart data</div>
                </div>
              </button>
            </div>
          </div>

          <DialogFooter>
            <button
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm"
              onClick={() => setExportModalOpen(false)}
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <button
        onClick={toggleTheme}
        className={`fixed bottom-6 left-6 p-3 rounded-full shadow-lg transition-all duration-300 z-50 ${
          isDarkMode 
            ? 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20' 
            : 'bg-gray-800/90 backdrop-blur-sm border border-gray-700 text-gray-200 hover:bg-gray-700'
        }`}
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    </div>
  );
} 