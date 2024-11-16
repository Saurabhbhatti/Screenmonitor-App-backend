import express from 'express';

import adminRouter from './admin';
import desktopRouter from './desktop';

const app = express();

app.use('/admin', adminRouter);
app.use('/desktop', desktopRouter);

export default app;
