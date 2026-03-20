const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

router.get('/today-summary', (req, res) => {
  try {
    const date          = req.query.date || new Date().toISOString().slice(0, 10);
    const raw           = db.getDailySummary(date);
    const cashEntries   = db.getCashEntries(date);
    const debitEntries  = db.getDebitEntries(date);
    const creditEntries = db.getCreditEntries(date);
    const expenses      = db.getExpenses(date);
    const totalCash     = raw?.total_cash     || 0;
    const totalDebit    = raw?.total_debit    || 0;
    const totalCredit   = raw?.total_credit   || 0;
    const totalExpenses = raw?.total_expenses || 0;
    const finalTotal    = totalCash + totalCredit - totalExpenses;
    const totalBags = debitEntries.reduce((sum, e) => {
      const bags = Array.isArray(e.bags) ? e.bags : [];
      return sum + bags.reduce((s, b) => s + (Number(b.numberOfBags) || 0), 0);
    }, 0);
    res.json({ date, totalCash, totalDebit, totalCredit, totalExpenses, finalTotal, totalBags,
      entries: { cash: cashEntries, debit: debitEntries, credit: creditEntries, expense: expenses } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/day-history', (req, res) => {
  try {
    const rows = db.getAllDailySummaries();
    res.json(rows.map(r => {
      const totalCash  = r.total_cash     || 0;
      const totalDebit = r.total_debit    || 0;
      const totalCredit= r.total_credit   || 0;
      const expenses   = r.total_expenses || 0;
      return { date: r.date, totalCash, totalDebit, totalCredit, expenses, finalTotal: totalCash + totalCredit - expenses };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all-customers', (req, res) => {
  try { res.json(db.getAllCustomersSummary()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/customer-records/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    res.json({ name, ledger: db.getCustomerLedger(name), balance: db.getCustomerBalance(name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/range', (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    const inRange = d => d && d >= from && d <= to;
    const summaries = db.getAllDailySummaries()
      .filter(r => inRange(r.date))
      .sort((a,b) => a.date.localeCompare(b.date))
      .map(r => {
        const tc = r.total_cash||0, td = r.total_debit||0, tcr = r.total_credit||0, te = r.total_expenses||0;
        return { ...r, total_cash:tc, total_debit:td, total_credit:tcr, total_expenses:te, net_balance: tc+tcr-te };
      });
    res.json({
      summaries,
      cashEntries:   db.getCashEntries(null).filter(e   => inRange(e.date)),
      debitEntries:  db.getDebitEntries(null).filter(e  => inRange(e.date)),
      creditEntries: db.getCreditEntries(null).filter(e => inRange(e.date)),
      expenses:      db.getExpenses(null).filter(e      => inRange(e.date))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;