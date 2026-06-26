const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

const AV_KEY = process.env.ALPHA_VANTAGE_KEY;
const AV_BASE = 'https://www.alphavantage.co/query';

// GET /api/stock/search?q=apple&market=US
router.get('/search', authenticate, async (req, res) => {
  const { q, market } = req.query;
  if (!q) return res.status(400).json({ message: 'Query is required.' });

  try {
    const response = await axios.get(AV_BASE, {
      params: {
        function: 'SYMBOL_SEARCH',
        keywords: q,
        apikey: AV_KEY
      }
    });

    let results = response.data.bestMatches || [];

    if (market === 'US') {
      results = results.filter(r => r['4. region'] === 'United States');
    } else if (market === 'IN') {
      results = results.filter(r => 
        r['4. region'].includes('India') || 
        r['1. symbol'].endsWith('.BSE') || 
        r['1. symbol'].endsWith('.NSE')
      );
    }

    const formatted = results.slice(0, 8).map(r => ({
      symbol: r['1. symbol'],
      companyName: r['2. name'],
      exchange: r['4. region']
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Search failed.', error: err.message });
  }
});

// GET /api/stock/:symbol/financials
router.get('/:symbol/financials', authenticate, async (req, res) => {
  try {
    const { symbol } = req.params;

    const [overviewRes, quoteRes] = await Promise.all([
      axios.get(AV_BASE, { params: { function: 'OVERVIEW', symbol, apikey: AV_KEY } }),
      axios.get(AV_BASE, { params: { function: 'GLOBAL_QUOTE', symbol, apikey: AV_KEY } })
    ]);

    const o = overviewRes.data;
    const q = quoteRes.data['Global Quote'] || {};

    if (!o || !o.Symbol) {
      return res.status(404).json({ message: 'Stock not found.' });
    }

    const financials = {
      currentPrice: parseFloat(q['05. price']) || null,
      currency: o.Currency || null,
      marketCap: parseFloat(o.MarketCapitalization) || null,

      // Valuation
      peRatio: parseFloat(o.PERatio) || null,
      forwardPE: parseFloat(o.ForwardPE) || null,
      pbRatio: parseFloat(o.PriceToBookRatio) || null,
      psRatio: parseFloat(o.PriceToSalesRatioTTM) || null,
      pegRatio: parseFloat(o.PEGRatio) || null,
      evToEbitda: parseFloat(o.EVToEBITDA) || null,
      evToRevenue: parseFloat(o.EVToRevenue) || null,

      // Profitability
      profitMargin: parseFloat(o.ProfitMargin) ? +(parseFloat(o.ProfitMargin) * 100).toFixed(2) : null,
      operatingMargin: parseFloat(o.OperatingMarginTTM) ? +(parseFloat(o.OperatingMarginTTM) * 100).toFixed(2) : null,
      grossMargin: parseFloat(o.GrossProfitTTM) || null,
      roe: parseFloat(o.ReturnOnEquityTTM) ? +(parseFloat(o.ReturnOnEquityTTM) * 100).toFixed(2) : null,
      roa: parseFloat(o.ReturnOnAssetsTTM) ? +(parseFloat(o.ReturnOnAssetsTTM) * 100).toFixed(2) : null,

      // Per Share
      eps: parseFloat(o.EPS) || null,
      forwardEps: parseFloat(o.ForwardAnnualDividendYield) || null,
      bookValuePerShare: parseFloat(o.BookValue) || null,
      revenuePerShare: parseFloat(o.RevenuePerShareTTM) || null,

      // Growth
      revenueGrowth: parseFloat(o.QuarterlyRevenueGrowthYOY) ? +(parseFloat(o.QuarterlyRevenueGrowthYOY) * 100).toFixed(2) : null,
      earningsGrowth: parseFloat(o.QuarterlyEarningsGrowthYOY) ? +(parseFloat(o.QuarterlyEarningsGrowthYOY) * 100).toFixed(2) : null,

      // Financial Health
      currentRatio: parseFloat(o.CurrentRatio) || null,
      quickRatio: parseFloat(o.QuickRatio) || null,
      deRatio: parseFloat(o.DebtToEquityRatio) || null,
      freeCashFlow: parseFloat(o.FreeCashFlow) || null,

      // Dividend
      dividendYield: parseFloat(o.DividendYield) ? +(parseFloat(o.DividendYield) * 100).toFixed(2) : null,

      // Market
      beta: parseFloat(o.Beta) || null,
      fiftyTwoWeekHigh: parseFloat(o['52WeekHigh']) || null,
      fiftyTwoWeekLow: parseFloat(o['52WeekLow']) || null,
      averageVolume: parseFloat(o.SharesFloat) || null,
    };

    res.json(financials);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch stock data.', error: err.message });
  }
});

module.exports = router;