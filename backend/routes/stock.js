const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;
const { authenticate } = require('../middleware/auth');

// GET /api/stock/search?q=apple&market=US
router.get('/search', authenticate, async (req, res) => {
  const { q, market } = req.query;

  if (!q) return res.status(400).json({ message: 'Query is required.' });

  try {
    const results = await yahooFinance.search(q);
    let quotes = results.quotes || [];

    if (market === 'IN') {
      quotes = quotes.filter(q => q.exchange === 'NSI' || q.exchange === 'BSE');
    } else if (market === 'US') {
      quotes = quotes.filter(q => ['NMS', 'NYQ', 'NGM', 'NCM'].includes(q.exchange));
    }

    const filtered = quotes.slice(0, 8).map(q => ({
      symbol: q.symbol,
      companyName: q.longname || q.shortname,
      exchange: q.exchange
    }));

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Search failed.', error: err.message });
  }
});

// GET /api/stock/:symbol/financials
router.get('/:symbol/financials', authenticate, async (req, res) => {
  try {
    let { symbol } = req.params;
    const { market } = req.query;

    if (market === 'IN' && !symbol.endsWith('.NS')) {
      symbol = `${symbol}.NS`;
    }

    const quote = await yahooFinance.quoteSummary(symbol, {
      modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'incomeStatementHistory']
    });

    const sd = quote.summaryDetail || {};
    const fd = quote.financialData || {};
    const ks = quote.defaultKeyStatistics || {};

    const financials = {
      // Core
      currentPrice: fd.currentPrice ?? null,
      currency: fd.financialCurrency ?? null,
      marketCap: sd.marketCap ?? null,

      // Valuation
      peRatio: sd.trailingPE ?? null,
      forwardPE: sd.forwardPE ?? null,
      pbRatio: ks.priceToBook ?? null,
      psRatio: ks.priceToSalesTrailing12Months ?? null,
      pegRatio: ks.pegRatio ?? null,
      evToEbitda: ks.enterpriseToEbitda ?? null,
      evToRevenue: ks.enterpriseToRevenue ?? null,

      // Profitability
      profitMargin: fd.profitMargins ? +(fd.profitMargins * 100).toFixed(2) : null,
      operatingMargin: fd.operatingMargins ? +(fd.operatingMargins * 100).toFixed(2) : null,
      grossMargin: fd.grossMargins ? +(fd.grossMargins * 100).toFixed(2) : null,
      ebitdaMargin: fd.ebitdaMargins ? +(fd.ebitdaMargins * 100).toFixed(2) : null,
      roe: fd.returnOnEquity ? +(fd.returnOnEquity * 100).toFixed(2) : null,
      roa: fd.returnOnAssets ? +(fd.returnOnAssets * 100).toFixed(2) : null,

      // Per Share
      eps: ks.trailingEps ?? null,
      forwardEps: ks.forwardEps ?? null,
      bookValuePerShare: ks.bookValue ?? null,
      revenuePerShare: fd.revenuePerShare ?? null,
      cashPerShare: ks.totalCashPerShare ?? null,

      // Growth
      revenueGrowth: fd.revenueGrowth ? +(fd.revenueGrowth * 100).toFixed(2) : null,
      earningsGrowth: fd.earningsGrowth ? +(fd.earningsGrowth * 100).toFixed(2) : null,

      // Financial Health / Ratios
      currentRatio: fd.currentRatio ?? null,
      quickRatio: fd.quickRatio ?? null,
      deRatio: fd.debtToEquity ?? null,
      freeCashFlow: fd.freeCashflow ?? null,
      totalCash: fd.totalCash ?? null,
      totalDebt: fd.totalDebt ?? null,

      // Dividend
      dividendYield: sd.dividendYield ? +(sd.dividendYield * 100).toFixed(2) : null,

      // Market
      beta: sd.beta ?? null,
      fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: sd.fiftyTwoWeekLow ?? null,
      averageVolume: sd.averageVolume ?? null,
    };

    res.json(financials);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch stock data.', error: err.message });
  }
});

module.exports = router;