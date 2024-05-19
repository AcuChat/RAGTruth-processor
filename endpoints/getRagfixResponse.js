const axios = require('axios');

const backend = `https://api.ragfix.ai:5305`;

const splitQuery = async (query) => {
    const request = {
        url: backend + '/split-query',
        method: 'post',
        data: {
            query
        }
    }

    const response = await axios(request);
    console.log('split-query', response.data);
    if (response.data.status !== 'success') return false;

    return response.data.content;
}

exports.getRagfixResponse = async (req, res) => {
    const { responseId, passages, query } = req.body;
    if (!responseId) return res.status(400).json('bad command: missing responseId');
    if (!passages) return res.status(400).json('bad command: missing passages');
    if (!query) return res.status(400).json('bad command: missing query');
    
    const prompts = await splitQuery(query);
    if (prompts === false) return res.status(500).json('unable to split query');
    console.log('prompts', prompts)

    return res.status(200).json(prompts);
}