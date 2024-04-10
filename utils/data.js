const axios = require('axios');


exports.response = [];

exports.getSourceInfo = () => {
    return new Promise((resolve, reject) => {
        let sourceInfo = [];
        axios.get('https://www.michaelcalvinwood.net/datasets/RAGTruth/source_info.jsonl')
        .then(response => {
          const lines = response.data.split("\n");
          for (let i = 0; i < lines.length; ++i) {
            try {
              const obj = JSON.parse(lines[i]);
              if (obj.task_type === 'QA') sourceInfo.push(obj);
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



axios.get('https://www.michaelcalvinwood.net/datasets/RAGTruth/response.jsonl')
    .then(response => {
      const lines = response.data.split("\n");
      console.log('lines[0]', lines[0])
      for (let i = 0; i < lines.length; ++i) {
        try {
          const obj = JSON.parse(lines[i]);
          exports.response.push(obj);
        } catch (err) {
          //console.error('Could not push ', i);
        }
      }
      console.log('Response', exports.response.length);
    })
    .catch(err => console.error(err));

