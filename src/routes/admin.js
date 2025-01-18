const express = require('express');
const router = express.Router();
const config = require('../../config');
const axios = require('axios');
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database
});

const promisePool = pool.promise();

const allowedIPs = config.whitelistedIps;

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

function logToDiscord(message) {
    axios.post(config.discWebhookUrl, {
        content: message,
    }).catch(err => console.error('Error logging to Discord:', err));
};

function generateKey(length) {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomPart}`;
}

const ipWhitelistMiddleware = (req, res, next) => {
  const clientIP = getClientIp(req);

  if (allowedIPs.includes(clientIP)) {
    next();
  } else {
    res.status(404).json({
      message: `Cannot GET ${req.originalUrl}`,
      error: 'Not Found',
      errorcode: 404
    });

    logToDiscord(`Unauthorized access attempt to \`${req.originalUrl}\` from IP: ${clientIP}`);
  }
};

router.get('/licenses', ipWhitelistMiddleware, async (req, res) => {
    if (!req.session.authenticated) {
        return res.redirect('/admin/auth');
    }

    try {
        const [rows] = await promisePool.query('SELECT * FROM Licenses');
        const licenses = rows.map(row => `
            <tr>
                <td>${row.id}</td>
                <td>${row.key}</td>
                <td>${row.username}</td>
                <td>${row.product}</td>
                <td>${row.authorized_ip}</td>
                <td><button onclick="deleteLicense(${row.id})">Delete</button></td>
            </tr>
        `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>License Keys</title>
                <link rel="icon" href="https://i.imgur.com/2lAqmks.png" type="image/png">
                <link rel="stylesheet" href="/style.css">
                </style>
                <script>
                    async function deleteLicense(id) {
                        if (confirm('Are you sure you want to delete this license?')) {
                            await fetch('/admin/delete-license', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ id })
                            });
                            window.location.reload();
                        }
                    }

                    async function createLicense(event) {
                        event.preventDefault();
                        const formData = new FormData(event.target);
                        const data = Object.fromEntries(formData.entries());
                        await fetch('/admin/create-license', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(data)
                        }).then(response => response.json())
                          .then(data => {
                              if (data.success) {
                                  alert('License created! Key: ' + data.key);
                              } else {
                                  alert('Failed to create license.');
                              }
                          });
                        window.location.reload();
                    }

                    async function editLicense(event) {
                        event.preventDefault();
                        const formData = new FormData(event.target);
                        const data = Object.fromEntries(formData.entries());
                        await fetch('/admin/edit-license', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(data)
                        }).then(response => response.json())
                          .then(data => {
                              if (data.success) {
                                  alert('License edited!');
                              } else {
                                  alert('Failed to edit license.');
                              }
                          });
                        window.location.reload();
                    }
                </script>
            </head>
            <body>
                <h1>License Keys</h1>
                <h1>Create License Key</h1>
                <form id="createForm" onsubmit="createLicense(event)">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required>
                    <label for="product">Product:</label>
                    <input type="text" id="product" name="product" required>
                    <label for="authorized_ip">IP Address:</label>
                    <input type="text" id="authorized_ip" name="authorized_ip" required>
                    <button type="submit">Create Key</button>
                </form>
                <h1>Edit License</h1>
                <form id="editForm" onsubmit="editLicense(event)">
                    <label for="license_key">License Key:</label>
                    <input type="text" id="license_key" name="license_key" required>
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required>
                    <label for="product">Product:</label>
                    <input type="text" id="product" name="product" required>
                    <label for="authorized_ip">IP Address:</label>
                    <input type="text" id="authorized_ip" name="authorized_ip" required>
                    <button type="submit">Edit Key</button>
                </form>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Key</th>
                            <th>Username</th>
                            <th>Product</th>
                            <th>Authorized IP</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${licenses}
                    </tbody>
                </table>
            </body>
            </html>
        `); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Database error');
    }
});

router.get('/auth', (req, res) => {
    res.send(`
        <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API System</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <h1>API System</h1>
  <form action="/admin/login" method="post">
    <label for="username">Username:</label>
    <input type="text" id="username" name="username" required>
    <br>
    <label for="password">Password:</label>
    <input type="password" id="password" name="password" required>
    <br>
    <button type="submit">Login</button>
  </form>
</body>
</html>
        
    `)
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const clientIp = getClientIp(req);
  
    if (username === 'root' && password === config.adminPassword) {
      req.session.authenticated = true;
      logToDiscord(`User logged in: ${username}`);
      return res.redirect('/admin/licenses');
    } else {
      logToDiscord(`Failed login attempt: ${username}\nIP: ${clientIp} password: ${password}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
});

router.post('/create-license', ipWhitelistMiddleware, async (req, res) => {
    const { username, product, authorized_ip } = req.body;
  
    if (!username || !product) {
      logToDiscord('Failed to create license: Missing username or product');
      return res.status(400).json({ error: 'Username and product are required' });
    }
  
    const key = generateKey(16); 
  
    try {
      await promisePool.query(
        'INSERT INTO Licenses (`key`, username, product, authorized_ip) VALUES (?, ?, ?, ?)',
        [key, username, product, authorized_ip]
      );
      logToDiscord(`License created: ${key}`);
      res.status(201).json({ success: true, key });
    } catch (err) {
      console.error(err);
      logToDiscord(`Database error when creating license: ${err.message}`);
      res.status(500).json({ error: 'Database error' });
    }
});
  
 router.post('/regen-license', ipWhitelistMiddleware, async (req, res) => {
    const { regenLicenseKey } = req.body;
  
    if (!regenLicenseKey) {
      return res.status(400).json({ error: 'License key is required' });
    }
  
    try {
      const newKey = generateKey(32);
  
      const [result] = await promisePool.query(
        'UPDATE Licenses SET `key` = ? WHERE `key` = ?',
        [newKey, regenLicenseKey]
      );
  
      if (result.affectedRows > 0) {
        logToDiscord(`License regenerated: ${newKey} (formerly ${regenLicenseKey})`);
        res.status(200).json({ success: true, newKey });
      } else {
        logToDiscord('Failed to regenerate license: No matching records found');
        res.status(404).json({ error: 'No matching license found' });
      }
    } catch (err) {
      console.error('Database error:', err);
      logToDiscord(`Database error when regenerating license: ${err.message}`);
      res.status(500).json({ error: 'Database error' });
    }
});
  
router.post('/edit-license', ipWhitelistMiddleware, async (req, res) => {
    const { license_key, authorized_ip, username, product } = req.body;
  
    if (!license_key || !authorized_ip || !username || !product) {
      return res.status(400).json({ error: 'License key, IP, Username & Product are required.' });
    }
  
    try {
      const [result] = await promisePool.query(
        'UPDATE Licenses SET authorized_ip = ?, username = ?, product = ? WHERE `key` = ?',
        [authorized_ip, username, product, license_key]
      );
  
      if (result.affectedRows > 0) {
        logToDiscord(`License updated: ${license_key}\nIP: ${authorized_ip}\nUsername: ${username}\nProduct: ${product}`);
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ error: 'No matching license found' });
      }
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
    }
});
  
 router.post('/delete-license', ipWhitelistMiddleware, async (req, res) => {
    const { id } = req.body;
  
    if (!id) {
      logToDiscord('Failed to delete license: Missing ID');
      return res.status(400).json({ error: 'ID is required' });
    }
  
    try {
      await promisePool.query(
        'DELETE FROM Licenses WHERE id = ?',
        [id]
      );
      logToDiscord(`License deleted: ID ${id}`);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      logToDiscord(`Database error when deleting license: ${err.message}`);
      res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
