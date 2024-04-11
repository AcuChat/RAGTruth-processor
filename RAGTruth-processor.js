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
const acurai = require('./utils/acurai');

const getSource = (response, sourceInfo) => sourceInfo.find(si => si.source_id === response.source_id);

const main = async () => {
    const sourceInfo = await data.getSourceInfo();
    const responseInfo = await data.getResponseInfo();

    const gpt4 = responseInfo.filter(r => r.model === 'gpt-4-0613' && (r.quality !== 'good' || r.labels.length));

    console.log(gpt4.length);

    for (let i = 0; i < gpt4.length; ++i) {
        const response = gpt4[i];
        const source = getSource(response, sourceInfo);
        if (!source) continue;
        const taskType = source.task_type;
        if (taskType !== 'QA') continue;
        console.log(`#${i}`, response);
        console.log(source);
        const packaged = {
            responseId: response.id,
            model: response.model,
            temperature: response.temperature,
            taskType: source.task_type,
            question: source.source_info.question,
            passages: source.source_info.passages,
            origResponse: response.response,
            hallucinations: response.labels.map(label => ({text: label.text, meta: label.meta, labelType: label.label_type})),
        }

        packaged.response = await acurai.processRagRequest(packaged.question, packaged.passages, packaged.model, {temperature: packaged.temperature});
        console.log('packaged', packaged)
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
