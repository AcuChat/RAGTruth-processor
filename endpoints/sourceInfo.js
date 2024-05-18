const data = require('../utils/data');

exports.sourceInfo = async (req, res) => res.status(200).json(data.getSourceInfo);
