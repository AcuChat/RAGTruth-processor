const mysql = require('./mysql');

exports.getTables = async (req, res) => {
    const q = 'SHOW TABLES';

    const result = await mysql.query(q);

    res.status(200).json(result);
}

exports.getData = async (req, res) => {
    const { tableName } = req.body;

    if (!tableName) return res.status(400).json({status: 'error', msg: "bad command"});

    const q = `SELECT * from ${tableName}`;

    const r = await mysql.query(q);
    for (let i = 0; i < r.length; ++i) r[i].package = JSON.parse(r[i].package);

    return res.status(200).json(r);
}