const mode = 'admin' // use public when submitting

require('dotenv').config();
const listenPort = process.argv.length === 2 ? 5100 : 5101;
const hostname = 'acurai.ai'
const privateKeyPath = `/etc/ssl-keys/acurai.ai/acurai.ai.key`;
const fullchainPath = `/etc/ssl-keys/acurai.ai/acurai.ai.pem`;

const ObjectsToCsv = require('objects-to-csv');
const express = require('express');
const https = require('https');
const cors = require('cors');
const fs = require('fs');
const socketio = require('socket.io');

const data = require('./utils/data');
const acurai = require('./utils/acurai');
const mysql = require('./utils/mysql');
const endpoints = require('./utils/endpoints');

const { table } = require('console');
const getSource = (response, sourceInfo) => sourceInfo.find(si => si.source_id === response.source_id);


/**
 * Express Server
 */
const app = express();
app.use(express.static('public'));
app.use(express.json({limit: '200mb'})); 
app.use(cors());


app.get('/', async (req, res) => res.status(200).send('hello world'));
app.get('/tables', (req, res) => endpoints.getTables(req, res));

app.post('/generateTable', async (req, res) => {
    generateTable(['Subtle Conflict', 'Evident Conflict'], ['QA'], ['gpt-3.5-turbo-0613'], res);
})
app.post('/data', (req, res) => endpoints.getData(req, res));

const httpsServer = https.createServer({
    key: fs.readFileSync(privateKeyPath),
    cert: fs.readFileSync(fullchainPath),
  }, app);
  

httpsServer.listen(listenPort, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${listenPort}`);
});
