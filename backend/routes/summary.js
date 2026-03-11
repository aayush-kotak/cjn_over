const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/today-summary — returns today's aggregated data
router.get('/today-summary', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Total Cash today
    const cashRow = db.prepare(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM cash_sales WHERE date(created_at) = ?"
    ).get(today);

    // Total Credit today
    const creditRow = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM credit_received WHERE date(created_at) = ?"
    ).get(today);

    // Total Bags from cash sales today
    const cashBagsRows = db.prepare(
      "SELECT bags FROM cash_sales WHERE date(created_at) = ?"
    ).all(today);

    let totalBagsCash = 0;
    cashBagsRows.forEach(r => {
      const bags = JSON.parse(r.bags);
      bags.forEach(b => { totalBagsCash += Number(b.numberOfBags) || 0; });
    });

    // Total Bags from debit sales today
    const debitBagsRows = db.prepare(
      "SELECT bags FROM debit_sales WHERE date(created_at) = ?"
    ).all(today);

    let totalBagsDebit = 0;
    debitBagsRows.forEach(r => {
      const bags = JSON.parse(r.bags);
      bags.forEach(b => { totalBagsDebit += Number(b.numberOfBags) || 0; });
    });

    const totalBags = totalBagsCash + totalBagsDebit;

    // Expenses today
    const expensesRow = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date(created_at) = ?"
    ).get(today);

    const expensesList = db.prepare(
      "SELECT * FROM expenses WHERE date(created_at) = ? ORDER BY created_at DESC"
    ).all(today);

    const totalCash = cashRow.total;
    const totalCredit = creditRow.total;
    const totalExpenses = expensesRow.total;
    const finalTotal = totalCash + totalCredit - totalExpenses;

    res.json({
      date: today,
      totalCash,
      totalCredit,
      totalBags,
      totalExpenses,
      expenses: expensesList,
      finalTotal
    });
  } catch (err) {
    console.error('Error fetching today summary:', err);
    res.status(500).json({ error: 'Failed to fetch today summary' });
  }
});

// GET /api/day-history — returns per-day summary for all past days
router.get('/day-history', (req, res) => {
  try {
    // Get all unique dates from all tables
    const dates = db.prepare(`
      SELECT DISTINCT date(created_at) as day FROM (
        SELECT created_at FROM cash_sales
        UNION ALL
        SELECT created_at FROM credit_received
        UNION ALL
        SELECT created_at FROM debit_sales
        UNION ALL
        SELECT created_at FROM expenses
      ) ORDER BY day DESC
    `).all();

    const history = dates.map(({ day }) => {
      const cashRow = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM cash_sales WHERE date(created_at) = ?"
      ).get(day);

      const creditRow = db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM credit_received WHERE date(created_at) = ?"
      ).get(day);

      // Count bags
      const cashBagsRows = db.prepare(
        "SELECT bags FROM cash_sales WHERE date(created_at) = ?"
      ).all(day);
      let totalBagsCash = 0;
      cashBagsRows.forEach(r => {
        const bags = JSON.parse(r.bags);
        bags.forEach(b => { totalBagsCash += Number(b.numberOfBags) || 0; });
      });

      const debitBagsRows = db.prepare(
        "SELECT bags FROM debit_sales WHERE date(created_at) = ?"
      ).all(day);
      let totalBagsDebit = 0;
      debitBagsRows.forEach(r => {
        const bags = JSON.parse(r.bags);
        bags.forEach(b => { totalBagsDebit += Number(b.numberOfBags) || 0; });
      });

      const expensesRow = db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date(created_at) = ?"
      ).get(day);

      return {
        date: day,
        totalBags: totalBagsCash + totalBagsDebit,
        cashTotal: cashRow.total,
        creditTotal: creditRow.total,
        expenses: expensesRow.total,
        finalTotal: cashRow.total + creditRow.total - expensesRow.total
      };
    });

    res.json(history);
  } catch (err) {
    console.error('Error fetching day history:', err);
    res.status(500).json({ error: 'Failed to fetch day history' });
  }
});

// GET /api/customer-records/:name — returns all debit + credit for a customer
router.get('/customer-records/:name', (req, res) => {
  try {
    const name = req.params.name;

    const debitRows = db.prepare(
      "SELECT * FROM debit_sales WHERE customer_name = ? ORDER BY created_at DESC"
    ).all(name);
    const parsedDebit = debitRows.map(r => ({ ...r, bags: JSON.parse(r.bags) }));

    const creditRows = db.prepare(
      "SELECT * FROM credit_received WHERE customer_name = ? ORDER BY created_at DESC"
    ).all(name);

    const totalDebit = debitRows.reduce((sum, r) => sum + r.grand_total, 0);
    const totalCredit = creditRows.reduce((sum, r) => sum + r.amount, 0);
    const balance = totalDebit - totalCredit;

    res.json({
      customerName: name,
      debitSales: parsedDebit,
      creditReceived: creditRows,
      totalDebit,
      totalCredit,
      balance
    });
  } catch (err) {
    console.error('Error fetching customer records:', err);
    res.status(500).json({ error: 'Failed to fetch customer records' });
  }
});

module.exports = router;
