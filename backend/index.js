require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.use('/', authRoutes);
app.use('/', categoryRoutes);
app.use('/', transactionRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return;
  }
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});