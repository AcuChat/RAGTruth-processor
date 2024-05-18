const mode = 'admin' // use public when submitting

require('dotenv').config();
const listenPort = process.argv.length === 2 ? 5100 : 5101;
const privateKeyPath = `/etc/ssl-keys/acurai.ai/acurai.ai.key`;
const fullchainPath = `/etc/ssl-keys/acurai.ai/acurai.ai.pem`;

const ObjectsToCsv = require('objects-to-csv');
const express = require('express');
const https = require('https');
const cors = require('cors');
const fs = require('fs');

const { table } = require('console');
const getSource = (response, sourceInfo) => sourceInfo.find(si => si.source_id === response.source_id);

/**
 * Import Endpoints
 */
const taskTypes = require('./endpoints/taskTypes');
const allModels = require('./endpoints/models');

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

const httpsServer = https.createServer({
    key: fs.readFileSync(privateKeyPath),
    cert: fs.readFileSync(fullchainPath),
  }, app);
  

httpsServer.listen(listenPort, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${listenPort}`);
});
