const mysql = require('./mysql');

exports.getTables = async (req, res) => {
    const q = 'SHOW TABLES';

    const result = await mysql.query(q);

    res.status(200).json(result);
}