import axios from 'axios';

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
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
  return corrections[upperSymbol] || upperSymbol;
}

export async function fetchStockQuote(symbol: string): Promise<StockData | null> {
  const normalizedSymbol = normalizeStockSymbol(symbol);
  
  try {
    console.log(`Fetching data for ${normalizedSymbol}...`);
    const response = await axios.get(
      `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?interval=1d&range=1d&includePrePost=false&events=div%2Csplit`
    );

    const data = response.data.chart.result[0];
    if (!data || !data.meta || !data.timestamp) {
      console.warn(`No data received for ${symbol}`);
      return null;
    }

    const meta = data.meta;
    const price = meta.regularMarketPrice || meta.previousClose || 0;
    const previousClose = meta.previousClose || price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    console.log(`Successfully fetched ${symbol}: $${price} (${change >= 0 ? '+' : ''}${change.toFixed(2)}, ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);

    return {
      symbol: meta.symbol || normalizedSymbol,
      name: getStockName(normalizedSymbol),
      price,
      change,
      changePercent,
      previousClose
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    return null;
  }
}

export async function fetchMultipleStocks(symbols: string[]): Promise<StockData[]> {
  const promises = symbols.map(symbol => fetchStockQuote(symbol));
  const results = await Promise.allSettled(promises);
  
  return results
    .map((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      } else {
        console.warn(`Failed to fetch data for ${symbols[index]}`);
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
      `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${days}d&includePrePost=false&events=div%2Csplit`
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
  
  // For custom stocks not in fallback data, return null to indicate failure
  return null;
} 