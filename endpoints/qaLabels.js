const info = require('../utils/info');

exports.qaLabels = async (req, res) => res.status(200).json(info.qaLabels);
