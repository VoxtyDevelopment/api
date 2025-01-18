const express = require('express');
const axios = require('axios')
const router = express.Router();
const mysql = require('mysql2');
const config = require('../../config');

const pool = mysql.createPool({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database
});

const promisePool = pool.promise();

function logToDiscord(message) {
    axios.post(config.discWebhookUrl, {
        content: message,
    }).catch(err => console.error('Error logging to Discord:', err));
}

const getClientIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    let ip;
  
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      ip = ips[0];
    } else {
      ip = req.connection.remoteAddress || req.socket.remoteAddress;
    }
  
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
  
    return ip;
  };

router.post('/', async (req, res) => {
    const { license_key } = req.body;
    const clientIp = getClientIp(req);
  
    if (!license_key) {
      logToDiscord('Validation failed: License key is missing');
      return res.status(400).json({ error: 'License key is required' });
    }
  
    try {
      const [rows] = await promisePool.query(
        'SELECT * FROM Licenses WHERE `key` = ? AND `authorized_ip` = ?',
        [license_key, clientIp]
      );
  
      if (rows.length > 0) {
        logToDiscord(`License key validated and IP matched: ${license_key} from ${clientIp}`);
        return res.status(200).json({ valid: true });
      } else {
        logToDiscord(`Validation failed: License key or IP mismatch for ${license_key} from ${clientIp}`);
        return res.status(404).json({ valid: false });
      }
    } catch (err) {
      console.error('Database error during validation:', err);
      logToDiscord(`Database error during validation: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;