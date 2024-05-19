const data = require('../utils/data');

exports.getResponses = async (req, res) => {
    const { models, labels } = req.body;
    if (!models) return res.status(400).json('bad request: missing models');
    if (!labels) return res.status(400).json('bad request: missing labels');
    if (!models.length) return res.status(400).json('bad request: missing models');
    if (!labels.length) return res.status(400).json('bad request: missing labels');
    
    const responseInfo = await data.getResponseInfo();
    const responses = [];
    responseInfo.forEach(ri => {
        let test = models.find(m => m === ri.model);
        if (!test) return;
        test = false;
        for (let i = 0; i < labels.length; ++i) {
            //console.log(ri.labels.toString());
            if ( (JSON.stringify(ri.labels).toLowerCase().indexOf(labels[i].toLowerCase())) !== -1 ) {
                test = true;
                break;
            }
        }
        if (!test) return;
        responses.push(ri);
    })
    return res.status(200).json(responses);
}