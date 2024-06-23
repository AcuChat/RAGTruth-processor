require('dotenv').config();
const axios = require('axios');
const sql = require('../utils/mysql');

const backend = `https://api-dev.ragfix.ai`;
const { RAGFIX_API_KEY } = process.env;

const apiKey = RAGFIX_API_KEY;

const splitQuery = async (query) => {
    const request = {
        url: backend + '/split-query',
        method: 'post',
        data: {
            query, apiKey
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
            texts, apiKey
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
            returnTransfer: true,
            apiKey
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
    console.log('q', q);
    let r = await sql.query(q);
    console.log('r', r);

    if (r.length && r[0]?.responses) return res.status(200).send(r[0].responses);

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

    q = `INSERT INTO responses (response_id, responses) VALUES (${sql.escape(responseId)}, ${sql.escape(JSON.stringify(ragfixResponses))}) ON DUPLICATE KEY UPDATE responses = ${sql.escape(JSON.stringify(ragfixResponses))}`;
    r = await sql.query(q);

    return res.status(200).json(ragfixResponses);
}