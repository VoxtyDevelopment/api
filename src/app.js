const express = require('express');
const mysql = require('mysql2');
const adminRoute = require('./routes/admin');
const validateRoute = require('./routes/validate');
const config = require('../config');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.lAeWfclnOuA6BOO1iseaY6yeyG6UQKuXvePOuFWRZ2o', 
    resave: false,
    saveUninitialized: true
}));

const pool = mysql.createPool({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database
  });

function initializeDatabase() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS Licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        product VARCHAR(255) NOT NULL,
        \`key\` VARCHAR(255) NOT NULL,
        authorized_ip VARCHAR(255) NOT NULL
      )
    `;
  
    pool.query(createTableQuery, (error) => {
        if (error) {
            console.error('Error creating table:', error);
        } else {
            return;
        }
    });
}
  
  initializeDatabase();

const promisePool = pool.promise();

app.use('/validate', validateRoute);
app.use('/admin', adminRoute);

app.use((req, res, next) => {
    res.status(404).json({
        message: `Cannot GET ${req.originalUrl}`,
        error: 'Not Found',
        errorcode: 404
    });
});


module.exports = app, promisePool;