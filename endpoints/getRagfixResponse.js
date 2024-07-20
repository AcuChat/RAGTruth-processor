require('dotenv').config();
const axios = require('axios');
const sql = require('../utils/mysql');

const backend = `http://api-dev.ragfix.ai`;
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

    const { query, passages, model, temperature, id } = req.body;

    let q, r;

    if (!query || !passages || !passages?.length) return res.status(400).json('bad command');

    const request = {
        url: "http://api-dev.ragfix.ai/acurai",
        method: 'post',
        data: {
            query,
            texts: passages,
            apiKey: RAGFIX_API_KEY
        }
    }

    const response = await axios(request);

    q = `UPDATE acurai_validation SET response = ${sql.escape(response?.data?.content)} WHERE id = ${id}`;
    r = await sql.query(q);

    console.log(q);
    console.log(r);

    return res.status(200).json(response.data);
}