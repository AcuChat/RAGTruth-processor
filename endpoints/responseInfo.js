const data = require('../utils/data');

exports.responseInfo = async (req, res) => {
    const responseInfo = await data.getResponseInfo();

    res.status(200).json(responseInfo);

}