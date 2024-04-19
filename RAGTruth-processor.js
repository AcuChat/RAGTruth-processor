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

/**
 * Available Options
 */
const allTaskTypes = [
    'Summary', 
    'Data2txt', 
    'QA'];
const allModels = [
    'gpt-4-0613',
    'gpt-3.5-turbo-0613',
    'mistral-7B-instruct',
    'llama-2-7b-chat',
    'llama-2-13b-chat',
    'llama-2-70b-chat']
const allLabels = [
    'Subtle Baseless Info', 
    'Evident Baseless Info', 
    'Subtle Conflict', 
    'Evident Conflict'];




const getSource = (response, sourceInfo) => sourceInfo.find(si => si.source_id === response.source_id);

const displayModels = async () => {
    const responseInfo = await data.getResponseInfo();
    const models = new Set();
    responseInfo.forEach(r => {
        models.add(r.model)
    })

    console.log(models);
}

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

const displayTaskTypes = async () => {
    const sourceInfo = await data.getSourceInfo();
    const taskTypes = new Set();
    sourceInfo.forEach(s => {
        taskTypes.add(s.task_type)
    })

    console.log(taskTypes);
}

const labelIsOfInterest = (labels, labelsOfInterest) => {
    const newLabels = [];
    for (let i = 0; i < labels.length; ++i) {
        const test = labelsOfInterest.find(loi => loi === labels[i].label_type);
        if (test) newLabels.push(labels[i]); 
    }

    return newLabels;
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
        package MEDIUMTEXT NOT NULL,
        status VARCHAR(64) DEFAULT 'new'
    )` 

    await mysql.query(q);

    return tableName;
}

const generateTable = async (labelsOfInterest, taskTypes, models) => {
    const sourceInfo = await data.getSourceInfo();
    const responseInfo = await data.getResponseInfo();

    let count = 0;

    //Create SQL table
    const tableName = await createTable();
    
    for (let i = 0; i < responseInfo.length; ++i) {
        const response = responseInfo[i];

        // Filter which responses to process
        if (!labelIsOfInterest(response.labels, labelsOfInterest)) continue;
        response.labels = labelIsOfInterest(response.labels, labelsOfInterest);
        if (!response.labels.length) continue;

        let test = models.find(m => m === response.model);
        if (!test) continue;
        
        
        // Filter which source types to process
        const source = getSource(response, sourceInfo);
        if (!source) continue;
        
        const taskType = source.task_type;
        test = taskTypes.find(tt => tt === taskType);
        if (!test) continue;

        // Clean contexts
        let contexts = source.source_info?.passages ? source.source_info.passages.split("\n\n") : source.source_info;
        const passages = source.source_info?.passages ? [...contexts] : contexts;
        if (source.source_info?.passages) {
            for (let j = 0; j < contexts.length; ++j) {
                if (contexts[j].startsWith(`passage ${j+1}:`)) contexts[j] = contexts[j].replace(`passage ${j+1}:`, '');
            }
            
            contexts = await acurai.processContexts(contexts);
        }

        // console.log(response)
        // console.log(source);
        // break;

        // Package data
        const packaged = {
            responseId: response.id,
            sourceId: response.source_id,
            model: response.model,
            temperature: response.temperature,
            taskType: source.task_type,
            question: source.source_info.question,
            passages,
            contexts,
            origResponse: response.response,
            disparities: response.labels.map(label => ({text: label.text, meta: label.meta, labelType: label.label_type})),
            meta: {labelsOfInterest, taskTypes, models}
        }

        packaged.Acurai = await acurai.processRagRequest(packaged.question, contexts, packaged.model, {temperature: packaged.temperature});

        const q = `INSERT INTO ${tableName} (package) VALUES (${mysql.escape(JSON.stringify(packaged))})`;
        console.log(q);
        await mysql.query(q);

        // TODO: Store packaged data in SQL
        ++count;
        console.log(`Packaged ${i+1}`);
    }

    console.log("ALL DONE!", count);
}

// generateTable(['Subtle Conflict', 'Evident Conflict'], ['QA'], ['gpt-3.5-turbo-0613'])
// displayLabelTypes();
// displayTaskTypes();
// displayModels();


/**
 * Express Server
 */
const app = express();
app.use(express.static('public'));
app.use(express.json({limit: '200mb'})); 
app.use(cors());

app.get('/', async (req, res) => res.status(200).send('hello world'));
app.get('/tables', (req, res) => endpoints.getTables(req, res));

app.post('/data', (req, res) => endpoints.getData(req, res));

const httpsServer = https.createServer({
    key: fs.readFileSync(privateKeyPath),
    cert: fs.readFileSync(fullchainPath),
  }, app);
  

httpsServer.listen(listenPort, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${listenPort}`);
});
