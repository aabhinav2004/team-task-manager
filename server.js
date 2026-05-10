require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/utils/db');

const port = process.env.PORT || 3000;

async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI is not set. API requests requiring MongoDB will fail until configured.');
    } else {
      await connectDB();
    }
    app.listen(port, () => console.log(`Team Task Manager running on port ${port}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
