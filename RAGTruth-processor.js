const mode = 'admin' // use public when submitting

require('dotenv').config();
const listenPort = process.argv.length === 2 ? 5100 : 5101;
const privateKeyPath = `/etc/letsencrypt/live/ragtruth-processor.acur.ai/privkey.pem`;
const fullchainPath = `/etc/letsencrypt/live/ragtruth-processor.acur.ai/fullchain.pem`;

const ObjectsToCsv = require('objects-to-csv');
const express = require('express');
const https = require('https');
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
app.use(cors());


app.get('/', async (req, res) => res.status(200).send('hello world'));
app.get('/task-types', (req, res) => statbilityService(req, res, taskTypes.taskTypes));
app.get('/models', (req, res) => statbilityService(req, res, allModels.models));
app.get('/qa-labels', (req, res) => statbilityService(req, res, qaLabels.qaLabels));
app.get('/source-info', (req, res) => statbilityService(req, res, sourceInfo.sourceInfo));
app.get('/response-info', (req, res) => statbilityService(req, res, responseInfo.responseInfo));

app.post('/get-responses', (req, res) => statbilityService(req, res, getResponses.getResponses));
app.post('/get-ragfix-response', (req, res) => statbilityService(req, res, getRagfixResponse.getRagfixResponse));

const httpsServer = https.createServer({
    key: fs.readFileSync(privateKeyPath),
    cert: fs.readFileSync(fullchainPath),
  }, app);
  

httpsServer.listen(listenPort, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${listenPort}`);
});
