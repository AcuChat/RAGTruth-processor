const data = require('../utils/data');

exports.sourceInfo = async (req, res) => {
    let { taskType } = req.query;

    //console.log('taskType', taskType);
    taskType = taskType ? [taskType] : [];
    const sourceInfo = await data.getSourceInfo(taskType);
    res.status(200).json(sourceInfo);
}
