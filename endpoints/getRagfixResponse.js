const axios = require('axios');

exports.getRagfixResponse = async (req, res) => {
    const { responseId, passages, query } = req.body;
    if (!responseId) return res.status(400).json('bad command: missing responseId');
    if (!passages) return res.status(400).json('bad command: missing passages');
    if (!query) return res.status(400).json('bad command: missing query');
    

    return res.status(200).json('ok');
}