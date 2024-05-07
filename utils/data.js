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
              //console.error('Could not push ', i);
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

const prepareData = async () => {
  const data = await this.getSourceInfo();
  const prompts = [];
  for (let i = 0; i < data.length; ++i) {
    if (data[i].task_type === 'QA') {
      const output = JSON.stringify(data[i].source_info.question) + "\n"
      fs.appendFileSync('questions.jsonl', output, 'utf-8')
    }
  }
}

prepareData();




