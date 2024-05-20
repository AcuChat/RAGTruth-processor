const data = require('../utils/data');

exports.getResponses = async (req, res) => {
    const { models, labels, tasks } = req.body;
    if (!models) return res.status(400).json('bad request: missing models');
    if (!labels) return res.status(400).json('bad request: missing labels');
    if (!tasks) return res.status(400).json('bad request: missing tasks');
    if (!models.length) return res.status(400).json('bad request: missing models');
    if (!labels.length) return res.status(400).json('bad request: missing labels');
    if (!tasks.length) return res.status(400).json('bad request: missing tasks');
    
    const responseInfo = await data.getResponseInfo();
    const sourceInfo = await data.getSourceInfo();

    const responses = [];

    /**
     * Filter by models, labels, and tasks
     */
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

        const source = sourceInfo.find(si => si.source_id === ri.source_id);
        //console.log('source task', source.task, source)
        test = tasks.find(task => task === source.task_type);
        if (!test) return;
        ri.source = source;
        responses.push(ri);
    })
    return res.status(200).json(responses);
}