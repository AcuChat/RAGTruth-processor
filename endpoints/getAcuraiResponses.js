const sql = require('../utils/mysql');

const getTestType = meta => {
    let implicitTrue = false;
    switch (meta?.label_type) {
        case 'Evident Conflict':
            implicitTrue = meta.implicit_true;
            if (!implicitTrue) return 'evidentConflict';
            return 'true';
        case 'Subtle Conflict':
            implicitTrue = meta.implicit_true;
            if (!implicitTrue) return 'subtleConflict';
            return 'true';
        case 'Evident Baseless Info':
            implicitTrue = meta.implicit_true;
            if (!implicitTrue) return 'evidentBaselessInfo';
            return 'true';
        case 'Subtle Baseless Info':
            implicitTrue = meta.implicit_true;
            if (!implicitTrue) return 'subtleBaselessInfo';
            return 'true';
        default:
            return 'unknown';
            
    }
}

const handleRAGTruth = async (req, res, model, types) => {
    model = model || 'gpt-4';
    let q = `SELECT * FROM acurai_validated WHERE dataset = 'RAGTruth' AND model='${model}'`;
    let r = await sql.query(q);

    if (types) r = r.filter(result => {
        const hallucination = result.hallucination;
        if (hallucination === 'no') return false;
        const meta = JSON.parse(result.meta);
        for (let i = 0; i < meta.length; ++i) {
            const testType = getTestType(meta[i]);
            const test = types.find(t => t === testType);
            if (test) return true;
        }
        return false;
    })
    
    return res.status(200).json(r);
}

exports.getAcuraiResponses = async (req, res) => {
    let { dataset, model, types } = req.body;

    if (!dataset) return res.status(400).json('missing dataset');

    switch (dataset) {
        case 'RAGTruth':
            return handleRAGTruth(req, res, model, types);
    }

    return res.status(400).json(`Uknown dataset: ${dataset}`);
}