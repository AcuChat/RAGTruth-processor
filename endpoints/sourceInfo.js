const data = require('../utils/data');

exports.sourceInfo = async (req, res) => {
    const sourceInfo = await data.getSourceInfo();
    res.status(200).json(sourceInfo);
}
