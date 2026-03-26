const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/today-summary', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const raw = await db.getDailySummary(date);
    const cashEntries = await db.getCashEntries(date);
    const debitEntries = await db.getDebitEntries(date);
    const creditEntries = await db.getCreditEntries(date);
    const expenses = await db.getExpenses(date);
    const totalCash = raw?.total_cash || 0;
    const totalDebit = raw?.total_debit || 0;
    const totalCredit = raw?.total_credit || 0;
    const totalExpenses = raw?.total_expenses || 0;
    const finalTotal = totalCash + totalCredit - totalExpenses;
    const totalBags = debitEntries.reduce((sum, e) => {
      const bags = Array.isArray(e.bags) ? e.bags : [];
      return sum + bags.reduce((s, b) => s + (Number(b.numberOfBags) || 0), 0);
    }, 0);
    res.json({
      date, totalCash, totalDebit, totalCredit, totalExpenses, finalTotal, totalBags,
      entries: { cash: cashEntries, debit: debitEntries, credit: creditEntries, expense: expenses }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/day-history', async (req, res) => {
  try {
    const rows = await db.getAllDailySummaries();
    res.json(rows.map(r => {
      const totalCash = r.total_cash || 0;
      const totalDebit = r.total_debit || 0;
      const totalCredit = r.total_credit || 0;
      const expenses = r.total_expenses || 0;
      return { date: r.date, totalCash, totalDebit, totalCredit, expenses, finalTotal: totalCash + totalCredit - expenses };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all-customers', async (req, res) => {
  try { res.json(await db.getAllCustomersSummary()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/customer-records/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    res.json({ name, ledger: await db.getCustomerLedger(name), balance: await db.getCustomerBalance(name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/range', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    const inRange = d => d && d >= from && d <= to;
    const allSummaries = await db.getAllDailySummaries();
    const summaries = allSummaries
      .filter(r => inRange(r.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => {
        const tc = r.total_cash || 0, td = r.total_debit || 0, tcr = r.total_credit || 0, te = r.total_expenses || 0;
        return { ...r, total_cash: tc, total_debit: td, total_credit: tcr, total_expenses: te, net_balance: tc + tcr - te };
      });

    const allCash = await db.getCashEntries(null);
    const allDebit = await db.getDebitEntries(null);
    const allCredit = await db.getCreditEntries(null);
    const allExp = await db.getExpenses(null);

    res.json({
      summaries,
      cashEntries: allCash.filter(e => inRange(e.date)),
      debitEntries: allDebit.filter(e => inRange(e.date)),
      creditEntries: allCredit.filter(e => inRange(e.date)),
      expenses: allExp.filter(e => inRange(e.date))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, from, to, type, min, max } = req.query;
    const searchStr = q ? q.toLowerCase() : '';
    const dateFrom = from || '1970-01-01';
    const dateTo = to || '9999-12-31';

    // Fetch all
    const cash = (type && type !== 'cash') ? [] : await db.getCashEntries(null);
    const debit = (type && type !== 'debit') ? [] : await db.getDebitEntries(null);
    const credit = (type && type !== 'credit') ? [] : await db.getCreditEntries(null);
    const exp = (type && type !== 'expense') ? [] : await db.getExpenses(null);

    // Normalize
    const all = [
      ...cash.map(e => ({ ...e, type: 'cash', amount: Number(e.amount || 0) })),
      ...debit.map(e => ({ ...e, type: 'debit', amount: Number(e.amount || 0) })),
      ...credit.map(e => ({ ...e, type: 'credit', amount: Number(e.amount || 0) })),
      ...exp.map(e => ({ ...e, type: 'expense', amount: Number(e.amount || 0), customer_name: e.category || 'Expense' }))
    ];

    // Filter
    const filtered = all.filter(e => {
      // Date range
      const itemDate = e.date || '1970-01-01';
      if (itemDate < dateFrom || itemDate > dateTo) return false;

      // Amount range
      const amt = Number(e.amount || 0);
      if (min && amt < Number(min)) return false;
      if (max && amt > Number(max)) return false;

      // Text search
      if (searchStr) {
        const nameMatch = (e.customer_name || '').toLowerCase().includes(searchStr);
        const noteMatch = (e.note || '').toLowerCase().includes(searchStr);
        const bagMatch = (Array.isArray(e.bags) ? JSON.stringify(e.bags) : '').toLowerCase().includes(searchStr);
        if (!nameMatch && !noteMatch && !bagMatch) return false;
      }

      return true;
    });

    // Sort latest first
    filtered.sort((a, b) => {
      const da = a.date || '1970-01-01';
      const db = b.date || '1970-01-01';
      const cmp = db.localeCompare(da);
      if (cmp !== 0) return cmp;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });

    res.json(filtered);
  } catch (err) {
    console.error('Search API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;