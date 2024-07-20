const mode = 'admin' // use public when submitting

require('dotenv').config();
const listenPort = process.argv.length === 2 ? 5100 : 5101;


const ObjectsToCsv = require('objects-to-csv');
const express = require('express');
//const https = require('https');
const http = require('http');
const cors = require('cors');
const fs = require('fs');


/**
 * Import Endpoints
 */
const taskTypes = require('./endpoints/taskTypes');
const allModels = require('./endpoints/models');
const qaLabels = require('./endpoints/qaLabels');
const sourceInfo = require('./endpoints/sourceInfo');
const responseInfo = require('./endpoints/responseInfo');
const getResponses = require('./endpoints/getResponses');
const getRagfixResponse = require('./endpoints/getRagfixResponse');
const updateRagfixResponse = require('./endpoints/updateRagfixResponse');
const getAcuraiResponses = require('./endpoints/getAcuraiResponses');

/**
 * Stability Service
 */
const statbilityService = async (req, res, endpoint) => {
    try {
      await endpoint(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json('Internal server error');
    }
  }
  

/**
 * Express Server
 */
const app = express();
app.use(express.static('public'));
app.use(express.json({limit: '200mb'})); 

const allowedOrigins = [
  'http://localhost:5173',
  'http://www.ragfix.ai',
  'https://www.ragfix.ai',
  'http://ragfix.ai',
  'https://ragfix.ai',
  'http://acur.ai',
  'https://acur.ai',
  'http://www.acur.ai',
  'https://www.acur.ai',
  'https://hallucination-analyzer.ragfix.ai',
  'https://hallucination-analyzer.acur.ai',
  'http://hallucination-analyzer.ragfix.ai',
  'http://hallucination-analyzer.acur.ai',

];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin, like mobile apps or curl requests
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Allow cookies if needed
  optionsSuccessStatus: 204 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

app.get('/', async (req, res) => res.status(200).send('hello world'));
app.get('/task-types', (req, res) => statbilityService(req, res, taskTypes.taskTypes));
app.get('/models', (req, res) => statbilityService(req, res, allModels.models));
app.get('/qa-labels', (req, res) => statbilityService(req, res, qaLabels.qaLabels));
app.get('/source-info', (req, res) => statbilityService(req, res, sourceInfo.sourceInfo));
app.get('/response-info', (req, res) => statbilityService(req, res, responseInfo.responseInfo));

app.post('/get-responses', (req, res) => statbilityService(req, res, getResponses.getResponses));
app.post('/get-ragfix-response', (req, res) => statbilityService(req, res, getRagfixResponse.getRagfixResponse));
app.post('/update-ragfix-response', (req, res) => statbilityService(req, res, updateRagfixResponse.updateRagfixResponse));
app.post('/get-acurai-responses', (req, res) => statbilityService(req, res, getAcuraiResponses.getAcuraiResponses));

const server = http.createServer(app);
server.listen(listenPort, '127.0.0.1', () => {
  console.log(`Server is running on http://localhost:${listenPort}`);
});


// const httpsServer = https.createServer({
//     key: fs.readFileSync(privateKeyPath),
//     cert: fs.readFileSync(fullchainPath),
//   }, app);


// httpsServer.listen(listenPort, '0.0.0.0', () => {
//     console.log(`HTTPS Server running on port ${listenPort}`);
// });
