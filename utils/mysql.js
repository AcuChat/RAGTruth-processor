require('dotenv').config();

const mysql = require('mysql2');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const data = require('./data');

const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, JWT_PASSWORD } = process.env;

const mysqlOptions = {
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
}

exports.escape = str => mysql.escape(str)

exports.mysql = mysql;

exports.pool = mysql.createPool(mysqlOptions);

exports.query = q => {
  return new Promise((resolve, reject) => {
    this.pool.query(q, function(err, rows, fields) {
      console.error(err);
      if (err) return resolve(false);
      resolve(rows)
    });
  })
}

// const sendContentToQdrant = async (brainId, contentId, vectorDb, content, startLine, endLine, openAIKey) => {
//   // console.log(`mysql.js sendContentToQdrant():
//   // \tbrainId: ${brainId}
//   // \tcontentId: ${contentId}
//   // \tvectorDb: ${vectorDb}
//   // \tcontent: ${content}
//   // \tstartLine: ${startLine}
//   // \tendLine: ${endLine}
//   // \topenAIKey: ${openAIKey}`);

//   const pointId = uuidv4();

//   const request = {
//     url: `https://${vectorDb}:5025/addOpenAIPoint`,
//     method: 'post',
//     data: {
//       openAIKey,
//       key: process.env.QDRANT_KEY,
//       collectionName: brainId,
//       pointId,
//       content,
//       payload: {
//         cid: contentId,
//         s: startLine,
//         e: endLine
//       }
//     }
//   }

//   request.data.content = request.data.content.length;
//   console.log('request', request);

//   try {
//     const response = await axios(request);
//     //console.log('response', response.data);
//   } catch (err) {
//     console.error(err);
//   }
// }

// const vectorizeContent = async (accountId, brainId, contentId, vectorDb, openAIKey, sliceSize = 1000) => {
//   console.log(`mysql.js vectorizeContent(): 
//   \taccountId: ${accountId}
//   \tbrainId: ${brainId}
//   \tcontentId: ${contentId}
//   \tvectorDb: ${vectorDb}
//   \topenAIKey: ${openAIKey}
//   \tsliceSize: ${sliceSize}`);
//   /*
//    * TODO: Add content vectorization here
//    */

//   // Retrieve the document

//   try {
//     let response = await axios.get('https://' + process.env.S3_BUCKET + '.' + process.env.S3_ENDPOINT_DOMAIN + `/accounts/${accountId}/brains/${brainId}/${contentId}/corrected.md`);
//     const document = response.data;
//     //console.log(`mysql.js vectorizeContent(): document`, document);
//     if (!document) return false;

//     response = await axios({
//       url: `https://${vectorDb}:5025/createCollection`,
//       method: 'post',
//       data: {
//         key: process.env.QDRANT_KEY,
//         collectionName: brainId,
//       }
//     })

//     //console.log(`mysql.js vectorizeContent(): createCollection response`, response.data);
    
//     // Split document into lines
//     const lines = document.split("\n");

//     // Store sliding window
//     let startLine = 0
//     let endLine = startLine;
//     let length = lines[startLine].length;
//     const numLines = lines.length;

//     while (endLine < numLines - 1) {
//       let potentialLength = length + lines[endLine+1].length;
//       // console.log(`iteration:
//       // \tlength: ${length},
//       // \tpotentialLength: ${potentialLength}
//       // \tstartLine: ${startLine}
//       // \tendLine: ${endLine}`);

//       if (potentialLength > sliceSize) {
//         let content = lines.slice(startLine, endLine+1).join("\n");
//         // console.log(`mysql.js vectorizeContent(): sendContentToQdrant
//         // \tbrainId: ${brainId}
//         // \tcontentId: ${contentId},
//         // \tvectorDb: ${vectorDb}
//         // \tcontent: ${content}
//         // \tstartLine: ${startLine}
//         // \tendLine: ${endLine}
//         // \topenAIKey: ${openAIKey}`);
//         let result = await sendContentToQdrant(brainId, contentId, vectorDb, content, startLine, endLine, openAIKey);
//         let prevStartLine = startLine;
//         startLine = Math.floor((endLine - startLine) * .75);
//         if (startLine > endLine) startLine = endLine - 1;
//         if (startLine <= prevStartLine) startLine = prevStartLine + 1;
//         endLine = startLine;
//         length = lines[startLine].length;
//       } else {
//         ++endLine;
//         length = potentialLength;
//       }
//     }

//     let content = lines.slice(startLine, endLine+1).join("\n");
//     // console.log(`mysql.js vectorizeContent(): sendContentToQdrant
//     // \tbrainId: ${brainId}
//     // \tcontentId: ${contentId},
//     // \tvectorDb: ${vectorDb}
//     // \tcontent: ${content}
//     // \tstartLine: ${startLine}
//     // \tendLine: ${endLine}
//     // \topenAIKey: ${openAIKey}`);
//     let result = await sendContentToQdrant(brainId, contentId, vectorDb, content, startLine, endLine, openAIKey);
//     return numLines;
//   } catch (err) {
//     console.error(`mysql.js vectorizeContent: ERROR`, err);
//     return false;
//   }
// }

// const vectorizeBrain = async (accountId, brainId, vectorDb, openAIKey) => {
//   console.log(`mysql.js vectorizeBrain(): `, accountId, brainId, vectorDb, openAIKey);
  
//   q = `SELECT content_id, vectorized FROM brain_content WHERE brain_id = '${brainId}'`;
//   r = await this.query(q);

//   console.log(`mysql.js vectorizeBrain(): content_id, vectorized values for brain(${brainId}):`, r);

//   for (let i = 0; i < r.length; ++i) {
//     if (!r[i].vectorized) {
//       let contentId = r[i].content_id;
//       await vectorizeContent(accountId, brainId, contentId, vectorDb, openAIKey);
//       q = `UPDATE brain_content SET vectorized = 1 WHERE content_id = '${contentId}'`;
//       r = await this.query(q);
//     }
//   }
// }

// exports.addContentEntry = async (accountId, contentId, brainId, date, origFileName, size, tokens, sourceType, source, title, meta = {}, openAIKey) => {
  
//   let query = `INSERT INTO brain_content (content_id, brain_id, content_date, original, size, tokens, source_type, source, title, meta) VALUES 
//   ('${contentId}', '${brainId}', '${date}', ${this.escape(origFileName)}, ${size}, ${tokens}, '${sourceType}', ${this.escape(source)}, ${this.escape(title)}, '${JSON.stringify(meta)}')`;

//   console.log(query);
//   console.log('mysql.js addContentEntry(): inserted brain_content table entry');

//   let result = await exports.query(query);

//   console.log("SQL RESULT", result)

//   query = `UPDATE brains SET tokens = tokens + ${tokens} WHERE brain_id = '${brainId}'`;

//   console.log(`mysql.js addContentEntry(): ${query}`);

//   result = await exports.query(query);

//   query = `SELECT tokens, vector_db FROM brains WHERE brain_id = '${brainId}'`;

//   console.log(`mysql.js addContentEntry(): ${query}`);

//   result = await this.query(query);

//   console.log(`mysql.js addContentEntry(): query result`, result);

//   if (!result.length) return false;

//   const curTokens = Number(result[0].tokens);

//   await vectorizeBrain(accountId, brainId, result[0].vector_db, openAIKey);
//   // if (result[0].vector_db) await vectorizeContent (accountId, brainId, contentId, result[0].vector_db, openAIKey);
//   // else if (tokens > 1000 && !result[0].vector_db) await vectorizeBrain(brainId, openAIKey);

//   return result;
// }


const { table } = require('console');
const getSource = (response, sourceInfo) => sourceInfo.find(si => si.source_id === response.source_id);

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



exports.createPackageTable = async () => {
  const tableName = `packages__${formatDate(null)}`
  const q = `CREATE TABLE ${tableName} (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      package MEDIUMTEXT NOT NULL,
      status VARCHAR(64) DEFAULT 'new'
  )` 

  await mysql.query(q);

  return tableName;
}

exports.generateTable = async (labelsOfInterest, taskTypes, models, res) => {
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

      // console.log(passages)
      // console.log(contexts);
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
          meta: {labelsOfInterest, taskTypes, models},
      }
      // console.log(packaged); break;

      packaged.Acurai = await acurai.processRagRequest(packaged.question, contexts, packaged.model, {temperature: packaged.temperature});
      // console.log('packaged', packaged);
      // break;

      const q = `INSERT INTO ${tableName} (package) VALUES (${mysql.escape(JSON.stringify(packaged))})`;
      await mysql.query(q);

      // TODO: Store packaged data in SQL
      ++count;
      console.log(`Processed #${count}`);
  }

  res.status(200).send(`Created ${tableName}`);
}


const createAcuraiValidationTable = async () => {
  let q = `CREATE TABLE IF NOT EXISTS acurai_validation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    dataset VARCHAR(64),
    model VARCHAR(64) DEFAULT 'gpt-4',
    temperature DECIMAL(3, 2) DEFAULT 0.70,
    query MEDIUMTEXT,
    passages MEDIUMTEXT,
    response MEDIUMTEXT,
    hallucination VARCHAR(16) DEFAULT 'no',
    acurai_response MEDIUMTEXT,
    validated VARCHAR(8) DEFAULT 'no',
    meta MEDIUMTEXT,
    INDEX (dataset),
    INDEX (model),
    INDEX (validated)
  )`

  let r = await this.query(q);

  
}

const loadRAGTruth = async () => {
  /** 
   * Load RAGTruth Info
   */

  let q = 'DELETE FROM acurai_validation WHERE dataset = "RAGTruth"';
  let r = await this.query(q);

  const sourceInfo = await data.getSourceInfo();
  const responseInfo = await data.getResponseInfo();

  // console.log('sourceInfo[0]', sourceInfo[0]);
  // console.log('responseInfo[0]', responseInfo[0]);

  const dataset = 'RAGTruth';
  const acuraiResponse = '';

  for (let i = 0; i < responseInfo.length; ++i) {
    const response = responseInfo[i];
    const source = sourceInfo.find(si => si.source_id === response.source_id);
    const model = response.model;
    const taskType = source.task_type;
    if (!model.startsWith('gpt')) continue;
    if (taskType !== 'QA') continue;

    const temperature = response.temperature;
    const query = source.source_info.question;
    const passages = source.source_info.passages.split("\n\n").map(p => p.substring(10));
    const answer = response.response;
    let hallucination = 'no';
    let meta = '{}';
    const isHallucination = response?.labels?.length ? true : false;
    if (isHallucination) {
      hallucination = 'yes';
      meta = JSON.stringify(response.labels);
    }

    q = `INSERT INTO acurai_validation (dataset, model, temperature, query, passages, response, hallucination, acurai_response, meta) VALUES (
      '${dataset}',
      '${model}',
      ${temperature},
      ${this.escape(query)},
      ${this.escape(JSON.stringify(passages))},
      ${this.escape(answer)},
      ${this.escape(hallucination)},
      '',
      ${this.escape(meta)}
    )`

    r = await this.query(q);
    
    // console.log(response);
    // console.log(source);

    console.log(i);
  }
}

//createAcuraiValidationTable();
loadRAGTruth();