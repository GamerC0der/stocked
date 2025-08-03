import axios from 'axios';

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
}

export interface IPOData {
  symbol: string;
  name: string;
  date: string;
  price: string;
  status: 'upcoming' | 'recent';
  exchange?: string;
  shares?: string;
  proceeds?: string;
}

function normalizeStockSymbol(symbol: string): string {
  const corrections: Record<string, string> = {
    'DJI': '^DJI',
    'DOW': '^DJI',
    'SPX': '^GSPC',
    'SP500': '^GSPC',
    'NASDAQ': '^IXIC',
    'VIX': '^VIX'
  };
  
  const upperSymbol = symbol.toUpperCase();
  const corrected = corrections[upperSymbol] || upperSymbol;
  return corrected;
}

export async function fetchStockQuote(symbol: string): Promise<StockData | null> {
  const normalizedSymbol = normalizeStockSymbol(symbol);
  
  try {
    console.log(`[DEBUG] Starting fetchStockQuote for ${normalizedSymbol}...`);
    
    const response = await axios.get(
      `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?interval=1d%26range=1d%26includePrePost=false%26events=div%252Csplit`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );

    console.log(`[DEBUG] Received response for ${normalizedSymbol}:`, response.status);
    
    const data = response.data.chart.result[0];
    if (!data || !data.meta || !data.timestamp) {
      console.warn(`[DEBUG] No valid data received for ${symbol}, using fallback`);
      return getFallbackStock(symbol);
    }

    const meta = data.meta;
    const price = meta.regularMarketPrice || meta.previousClose || 0;
    const previousClose = meta.previousClose || price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    console.log(`[DEBUG] Successfully processed ${symbol}: $${price} (${change >= 0 ? '+' : ''}${change.toFixed(2)}, ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);

    return {
      symbol: meta.symbol || normalizedSymbol,
      name: getStockName(normalizedSymbol),
      price,
      change,
      changePercent,
      previousClose
    };
  } catch (error) {
    console.error(`[DEBUG] Error fetching stock data for ${symbol}:`, error);
    return getFallbackStock(symbol);
  }
}

export async function fetchMultipleStocks(symbols: string[]): Promise<StockData[]> {
  console.log(`[DEBUG] Starting fetchMultipleStocks for ${symbols.length} symbols:`, symbols);
  
  const promises = symbols.map(symbol => fetchStockQuote(symbol));
  const results = await Promise.allSettled(promises);
  
  console.log(`[DEBUG] fetchMultipleStocks results:`, results.map((r, i) => ({ symbol: symbols[i], status: r.status, value: r.status === 'fulfilled' ? r.value?.symbol : 'rejected' })));
  
  return results
    .map((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      } else {
        console.warn(`[DEBUG] Failed to fetch data for ${symbols[index]}, using fallback`);
        const fallback = getFallbackStock(symbols[index]);
        return fallback;
      }
    })
    .filter((stock): stock is StockData => stock !== null);
}

export interface ChartData {
  date: string;
  price: number;
}

export async function fetchStockChart(symbol: string, days: number = 30): Promise<ChartData[]> {
  try {
    const response = await axios.get(
      `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d%26range=${days}d%26includePrePost=false%26events=div%252Csplit`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );

    const data = response.data.chart.result[0];
    if (!data || !data.timestamp || !data.indicators.quote[0].close) {
      console.warn(`No chart data received for ${symbol}`);
      return generateMockChartData(days);
    }

    const timestamps = data.timestamp;
    const prices = data.indicators.quote[0].close;
    
    return timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toLocaleDateString(),
      price: prices[index] || 0
    })).filter((item: ChartData) => item.price > 0);
  } catch (error) {
    console.error(`Error fetching chart data for ${symbol}:`, error);
    return generateMockChartData(days);
  }
}

function generateMockChartData(days: number): ChartData[] {
  const data: ChartData[] = [];
  const basePrice = 100 + Math.random() * 200;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const randomChange = (Math.random() - 0.5) * 10;
    const price = Math.max(0, basePrice + randomChange + (days - i) * 0.5);
    
    data.push({
      date: date.toLocaleDateString(),
      price: Math.round(price * 100) / 100
    });
  }
  
  return data;
}

function getStockName(symbol: string): string {
  const names: Record<string, string> = {
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'MSFT': 'Microsoft Corp.',
    'TSLA': 'Tesla Inc.',
    'AMZN': 'Amazon.com Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corp.',
    'NFLX': 'Netflix Inc.',
    'SPY': 'SPDR S&P 500 ETF',
    'QQQ': 'Invesco QQQ Trust',
    '^DJI': 'Dow Jones Industrial Average',
    '^GSPC': 'S&P 500 Index',
    '^IXIC': 'NASDAQ Composite',
    '^VIX': 'CBOE Volatility Index',
    'DJI': 'Dow Jones Industrial Average',
    'DIA': 'SPDR Dow Jones Industrial Average ETF'
  };
  return names[symbol] || symbol;
}

function getFallbackStock(symbol: string): StockData | null {
  const fallbackData: Record<string, { price: number; change: number; changePercent: number }> = {
    'AAPL': { price: 185.92, change: 2.45, changePercent: 1.34 },
    'GOOGL': { price: 142.56, change: -1.23, changePercent: -0.85 },
    'MSFT': { price: 378.85, change: 5.67, changePercent: 1.52 },
    'TSLA': { price: 248.42, change: -3.21, changePercent: -1.28 },
    'AMZN': { price: 145.24, change: 1.89, changePercent: 1.32 },
    'META': { price: 485.58, change: 8.92, changePercent: 1.87 },
    'NVDA': { price: 875.28, change: 15.67, changePercent: 1.82 },
    'NFLX': { price: 612.04, change: -2.15, changePercent: -0.35 },
    'SPY': { price: 468.92, change: 3.45, changePercent: 0.74 },
    'QQQ': { price: 398.67, change: 4.23, changePercent: 1.07 }
  };

  const data = fallbackData[symbol];
  
  if (data) {
    return {
      symbol,
      name: getStockName(symbol),
      price: data.price,
      change: data.change,
      changePercent: data.changePercent
    };
  }
  return null;
} 

class WatchlistDB {
  private dbName = 'StockedDB';
  private version = 1;
  private storeName = 'watchlist';

  async initDB(): Promise<IDBDatabase> {
    console.log('[DEBUG] Initializing IndexedDB...');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('[DEBUG] IndexedDB open error:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log('[DEBUG] IndexedDB opened successfully');
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('[DEBUG] IndexedDB upgrade needed');
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.log('[DEBUG] Creating object store:', this.storeName);
          db.createObjectStore(this.storeName, { keyPath: 'symbol' });
        }
      };
    });
  }

  async getWatchlist(): Promise<string[]> {
    try {
      console.log('[DEBUG] Getting watchlist from IndexedDB...');
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onerror = () => {
          console.error('[DEBUG] IndexedDB getWatchlist error:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          const symbols = request.result.map((item: any) => item.symbol);
          console.log('[DEBUG] Retrieved watchlist symbols:', symbols);
          resolve(symbols);
        };
      });
    } catch (error) {
      console.error('[DEBUG] Error getting watchlist:', error);
      return [];
    }
  }

  async addToWatchlist(symbol: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({ symbol, addedAt: Date.now() });
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  }

  async removeFromWatchlist(symbol: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(symbol);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  }

  async clearWatchlist(): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error clearing watchlist:', error);
    }
  }
}

export const watchlistDB = new WatchlistDB(); 

export async function exportWatchlist(): Promise<void> {
  try {
    const watchlistSymbols = await watchlistDB.getWatchlist();
    if (watchlistSymbols.length === 0) {
      throw new Error('No stocks in watchlist to export');
    }

    const watchlistData = await fetchMultipleStocks(watchlistSymbols);
    
    // Create CSV content
    const csvContent = [
      'Symbol,Name,Price,Change,ChangePercent',
      ...watchlistData.map(stock => 
        `${stock.symbol},"${stock.name}",${stock.price},${stock.change},${stock.changePercent}%`
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watchlist_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error exporting watchlist:', error);
    throw error;
  }
}

export async function importWatchlist(file: File): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('Invalid CSV file. Please ensure it has a header row and at least one stock.');
    }

    // Skip header row and extract symbols
    const symbols = lines.slice(1).map(line => {
      const parts = line.split(',');
      return parts[0]?.trim().toUpperCase();
    }).filter(symbol => symbol && symbol.length > 0);

    if (symbols.length === 0) {
      throw new Error('No valid stock symbols found in the CSV file.');
    }

    // Clear existing watchlist and add new symbols
    await watchlistDB.clearWatchlist();
    for (const symbol of symbols) {
      await watchlistDB.addToWatchlist(symbol);
    }

    return { success: true, message: `Successfully imported ${symbols.length} stocks to watchlist.`, count: symbols.length };
  } catch (error) {
    console.error('Error importing watchlist:', error);
    throw error;
  }
} 

export async function fetchRecentIPOs(): Promise<IPOData[]> {
  try {
    const response = await fetch(`https://corsproxy.io/?https://www.nyse.com/api/ipo-center/calendar`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch recent IPOs:', response.status, response.statusText);
      return getFallbackRecentIPOs();
    }
    
    const data = await response.json();
    console.log('NYSE IPO API response:', data);
    
    if (data.calendarList && Array.isArray(data.calendarList)) {
      const pricedIPOs = data.calendarList.filter((ipo: any) => 
        ipo.deal_status_flg === 'P' && ipo.offer_px_usd > 0
      );
      
      const sortedIPOs = pricedIPOs.sort((a: any, b: any) => b.price_dt - a.price_dt);
      
      const recentIpoData = sortedIPOs.slice(0, 20).map((ipo: any) => {
        const priceDate = new Date(ipo.price_dt);
        const formattedDate = priceDate.toISOString().split('T')[0];
        
        return {
          symbol: ipo.symbol || 'N/A',
          name: ipo.issuer_nm || 'N/A',
          date: formattedDate,
          price: ipo.offer_px_usd ? `$${ipo.offer_px_usd.toFixed(2)}` : 'N/A',
          status: 'recent' as const,
          exchange: ipo.custom_group_exchange_nm || 'N/A',
          shares: ipo.offer_size_inc_shoe_qty ? `${(ipo.offer_size_inc_shoe_qty / 1000000).toFixed(1)}M` : 'N/A',
          proceeds: ipo.offer_greenshoe_inc_proceeds_usd_amt ? `$${(ipo.offer_greenshoe_inc_proceeds_usd_amt / 1000000).toFixed(0)}M` : 'N/A'
        };
      });
      
      return recentIpoData;
    } else {
      console.log('No IPO calendar data found in response');
      return getFallbackRecentIPOs();
    }
  } catch (error) {
    console.error('Error fetching recent IPOs:', error);
    return getFallbackRecentIPOs();
  }
}

function getFallbackRecentIPOs(): IPOData[] {
  return [
    {
      symbol: 'PLACEHOLDER',
      name: 'Placeholder IPO',
      date: '2025-08-02',
      price: '$0.00',
      status: 'recent',
      exchange: 'IDK',
      shares: 'N/A',
    }
  ];
} 
