const axios = require('axios');
const sql = require('../utils/mysql');

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

const simplifyRoutes = async (texts) => {
    const request = {
        url: backend + '/simplify-routes',
        method: 'post',
        data: {
            texts
        }
    }

    try {
        const response = await axios(request);
        return response.data;
    } 
    catch (err) {
        console.error(err);
        return false;
    }
}

const queryUsingNounPhraseCollisionElimination = async (userPrompts, texts, model) => {
    const request = {
        url: backend + '/query-using-noun-phrase-collision-elimination',
        method: 'post',
        data: {
            texts, 
            userPrompts,
            model,
            temperature: 0.7,
            returnTransfer: true
        }
    }

    try {
        const response = await axios(request);
        return response.data;
    } 
    catch (err) {
        console.error(err);
        return false;
    }
}

exports.getRagfixResponse = async (req, res) => {
    const { responseId, passages, query, model } = req.body;
    if (!responseId) return res.status(400).json('bad command: missing responseId');

    let q = `SELECT responses FROM responses WHERE response_id = ${sql.escape(responseId)}`;
    let r = await sql.query(q);

    if (r.length) return res.status(200).send(r[0].responses);

    if (!passages) return res.status(400).json('bad command: missing passages');
    if (!query) return res.status(400).json('bad command: missing query');
    if (!model) return res.status(400).json('bad command: missing model');

    /**
     * Split Query
     */
    
    const prompts = await splitQuery(query);
    if (prompts === false) return res.status(500).json('unable to split query');
    console.log('prompts', prompts)
    
    /**
     * Simplify Routes
     */
    
    const routes = await simplifyRoutes(passages);

    /**
     * Query Usine Noun-Phrase Collision Elimination
     */
    
    const responses = await queryUsingNounPhraseCollisionElimination(prompts, routes, model);

    const ragfixResponses = {ragfixResponses: responses};

    q = `INSERT INTO responses (response_id, responses) VALUES (${sql.escape(responseId)}, ${sql.escape(JSON.stringify(ragfixResponses))})`;
    r = await sql.query(q);

    return res.status(200).json(ragfixResponses);
}