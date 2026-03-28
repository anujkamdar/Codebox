import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

import routes from './routes.js';
app.use("", routes);


app.listen(5000, () => {
    console.log('Public API Server running on http://localhost:5000');
});