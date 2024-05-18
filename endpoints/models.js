const info = require('../utils/info');

exports.models = async (req, res) => res.status(200).json(info.allModels);