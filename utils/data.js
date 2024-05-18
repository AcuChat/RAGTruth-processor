const axios = require('axios');
const fs = require('fs');

exports.response = [];

exports.getSourceInfo = () => {
    return new Promise((resolve, reject) => {
        let sourceInfo = [];
        axios.get('https://www.michaelcalvinwood.net/datasets/RAGTruth/source_info.jsonl')
        .then(response => {
          const lines = response.data.split("\n");
          console.log('Num Sources', lines.length);
          for (let i = 0; i < lines.length; ++i) {
            try {
              const obj = JSON.parse(lines[i]);
              sourceInfo.push(obj);
            } catch (err) {
              console.error('Could not push ', i);
            }
          }
          resolve(sourceInfo);
        })
        .catch(err => {
            console.error(err);
            resolve([])
        });
    })
}

exports.getResponseInfo = () => {
    return new Promise((resolve, reject) => {
        let responseInfo = [];
        axios.get('https://www.michaelcalvinwood.net/datasets/RAGTruth/response.jsonl')
        .then(response => {
          const lines = response.data.split("\n");
          for (let i = 0; i < lines.length; ++i) {
            try {
              const obj = JSON.parse(lines[i]);
              responseInfo.push(obj);
            } catch (err) {
              //console.error('Could not push ', i);
            }
          }
         resolve(responseInfo);
        })
        .catch(err => {
            console.error(err);
            resolve([]);
        });
    })
}


const extractQaQuestions = async () => {
  const data = await this.getSourceInfo();
  const prompts = [];
  for (let i = 0; i < data.length; ++i) {
    if (data[i].task_type === 'QA') {
      const output = JSON.stringify(data[i].source_info.question) + "\n"
      fs.appendFileSync('questions.jsonl', output, 'utf-8')
    }
  }
}

const extractHallucinatedSources = async () => {
  const sources = await this.getSourceInfo();
  const responses = await this.getResponseInfo();

  console.log(responses.length);

  let count = 0;
  let sourceSet = new Set();

  for (let i = 0; i < responses.length; ++i) {
   
    const source = sources.find(s => s.source_id === responses[i].source_id);
    if (source.task_type !== 'QA') continue;
    if (!responses[i]?.labels?.length) continue;
    if (responses[i].model === 'mistral-7B-instruct' || responses[i].model === 'llama-2-7b-chat' || responses[i].model === 'llama-2-70b-chat' || responses[i].model === 'llama-2-13b-chat') continue;
    
    sourceSet.add(source.source_id);
    ++count;
  }

  const sourceArr = Array.from(sourceSet);
  for (let i = 0; i < sourceArr.length; ++i) {
    const source = sources.find(s => s.source_id === sourceArr[i]);
    const { passages } = source.source_info;
    console.log('passages', passages)
    passages.split("\n\n").forEach(p => {
      const passage = p.substring(10).replaceAll('–', '-').replaceAll('’', `'`).replaceAll('‘', `'`).replaceAll('⁄', '/');
      if (passage) fs.appendFileSync('passages.jsonl', JSON.stringify(passage) + "\n", "utf-8");
    })
    console.log(i)
  }  
}

//extractQaQuestions();


extractHallucinatedSources();