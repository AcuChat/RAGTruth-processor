const info = require('../utils/info');

exports.taskTypes = async (req, res) => {
    res.status(200).json(info.allTaskTypes);
}