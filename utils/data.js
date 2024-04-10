const axios = require('axios');

exports.sourceInfo = [];

axios.get('https://www.michaelcalvinwood.net/datasets/RAGTruth/source_info.jsonl')
    .then(response => {
      const lines = response.data.split("\n");
      for (let i = 0; i < lines.length; ++i) {
        try {
          const obj = JSON.parse(lines[i]);
          if (obj.task_type === 'QA') exports.sourceInfo.push(obj);
        } catch (err) {
          console.error('Could not push ', i);
        }
      }
      console.log("SourceInfo", exports.sourceInfo)
    })
    .catch(err => console.error(err));
