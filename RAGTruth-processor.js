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
const { table } = require('console');



const getSource = (response, sourceInfo) => sourceInfo.find(si => si.source_id === response.source_id);

const displayLabelTypes = async () => {
    const responseInfo = await data.getResponseInfo();
    const labelTypes = new Set();
    responseInfo.forEach(r => {
        for (let i = 0; i < r.labels.length; ++i) {
            labelTypes.add(r.labels[i].label_type)
        }
    })

    console.log(labelTypes);
}

const labelIsOfInterest = labels => {
    for (let i = 0; i < labels.length; ++i) {
        if (labels[i].label_type === 'Evident Conflict') return true;
        if (labels[i].label_type === 'Subtle Conflict') return true;   
    }

    return false;
}

function formatDate(date) {
    var d = date === null ? new Date() : new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear(),
        hour = d.getHours(),
        minutes = d.getMinutes();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;
    if (hour.length < 2)
        hour = '0' + hour;
    if (minutes.length < 2)
        minutes = '0' + minutes;

    return [year, month, day, hour, minutes].join('_');
}

const createTable = async () => {
    const tableName = `packages__${formatDate(null)}`
    const q = `CREATE TABLE ${tableName} (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        package MEDIUMTEXT NOT NULL
    )` 

    await mysql.query(q);

    return tableName;
}

const main = async () => {
    const sourceInfo = await data.getSourceInfo();
    const responseInfo = await data.getResponseInfo();

    let count = 0;

    //Create SQL table
    const tableName = await createTable();
    
    for (let i = 0; i < responseInfo.length; ++i) {
        const response = responseInfo[i];

        // Filter which responses to process
        if (response.model !== 'gpt-4-0613') continue;
        if (!response.labels.length) continue;
        if (!labelIsOfInterest(response.labels)) continue;
        
        // Filter which source types to process
        const source = getSource(response, sourceInfo);
        if (!source) continue;
        const taskType = source.task_type;
        if (taskType !== 'QA') continue;

        // Clean contexts
        const contexts = source.source_info.passages.split("\n\n");
        for (let j = 0; j < contexts.length; ++j) {
            if (contexts[j].startsWith(`passage ${j+1}:`)) contexts[j] = contexts[j].replace(`passage ${j+1}:`, '');
        }

        // Package data
        const packaged = {
            responseId: response.id,
            model: response.model,
            temperature: response.temperature,
            taskType: source.task_type,
            question: source.source_info.question,
            contexts,
            origResponse: response.response,
            disparities: response.labels.map(label => ({text: label.text, meta: label.meta, labelType: label.label_type})),
        }

        packaged.Acurai = await acurai.processRagRequest(packaged.question, contexts, packaged.model, {temperature: packaged.temperature});

        const q = `INSERT INTO ${tableName} (package) VALUES (${mysql.escape(JSON.stringify(packaged))})`;
        await mysql.query(q);

        // TODO: Store packaged data in SQL

        console.log(`Packaged ${i+1}:\n`, packaged);
        ++count;
        if (count > 2) break;
    }
}

main();
//displayLabelTypes();




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
