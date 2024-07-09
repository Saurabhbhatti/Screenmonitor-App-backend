import express from 'express';

import adminRouter from './admin.js';
import desktopRouter from './desktop.js';

const app = express();

app.use('/admin', adminRouter);
app.use('/desktop', desktopRouter);

export default app;
