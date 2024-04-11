require('dotenv').config();
const listenPort = process.argv.length === 2 ? 5100 : 5101;
const hostname = 'acurai.ai'
const privateKeyPath = `/etc/ssl-keys/acurai.ai/acurai.ai.key`;
const fullchainPath = `/etc/ssl-keys/acurai.ai/acurai.ai.pem`;

const express = require('express');
const https = require('https');
const cors = require('cors');
const fs = require('fs');
const socketio = require('socket.io');

const data = require('./utils/data');

const getSource = (response, sourceInfo) => sourceInfo.find(si => si.source_id === response.source_id);

const main = async () => {
    const sourceInfo = await data.getSourceInfo();
    const responseInfo = await data.getResponseInfo();

    const gpt4 = responseInfo.filter(r => r.model === 'gpt-4-0613' && (r.quality !== 'good' || r.labels.length));

    console.log(gpt4.length);

    for (let i = 0; i < 10; ++i) {
        console.log(`#${i}`, gpt4[i]);
        const source = getSource(gpt4[i], sourceInfo);
        

        console.log(source);

        break;
    }

}

main();





/**
 * Express Server
 */
const app = express();
app.use(express.static('public'));
app.use(express.json({limit: '200mb'})); 
app.use(cors());

app.get('/', async (req, res) => res.status(200).send('hello world'));

const httpsServer = https.createServer({
    key: fs.readFileSync(privateKeyPath),
    cert: fs.readFileSync(fullchainPath),
  }, app);
  

httpsServer.listen(listenPort, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${listenPort}`);
});
