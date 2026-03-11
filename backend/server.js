const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const cashSaleRoutes = require('./routes/cashSale');
const creditRoutes = require('./routes/credit');
const debitSaleRoutes = require('./routes/debitSale');
const expensesRoutes = require('./routes/expenses');
const summaryRoutes = require('./routes/summary');

app.use('/api/cash-sale', cashSaleRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/debit-sale', debitSaleRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api', summaryRoutes);

// Serve Static Files from Frontend
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuildPath));

// Catch-all route to serve Index.html (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🐄 CJN PVT LTD PROD SERVER`);
  console.log(`➜  Local:   http://localhost:${PORT}`);
  console.log(`➜  Network: http://192.168.1.25:${PORT}`);
  console.log(`➜  Database: SQLite (local file)\n`);
});
