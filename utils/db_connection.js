
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();


const local_connection = new Pool
    ({
        user: `${process.env.LOCAL_USER_DB}`,
        host: `${process.env.LOCAL_HOST}`,
        database: `${process.env.LOCAL_DATABASE}`,
        password: `${process.env.LOCAL_PASSWORD}`,
        port: `${process.env.LOCAL_DB_PORT}`,
    });



function local_client() {
    local_connection.query(`SELECT 1`, (err, res) => {
        if (err) {
            console_log(`Free To Play : Error connecting to {${process.env.LOCAL_HOST}}`);
            setTimeout(local_client, 60000);
        } else {
            console_log(`Free To Play : Successfully connected to {${process.env.LOCAL_HOST}}`);
        }
    });
}


local_client();


module.exports = { local_connection };