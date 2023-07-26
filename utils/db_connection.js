
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const joystick_connection = new Pool
    ({
        user: `${process.env.JOYSTICK_USER_DB}`,
        host: `${process.env.JOYSTICK_HOST}`,
        database: `${process.env.JOYSTICK_DATABASE}`,
        password: `${process.env.JOYSTICK_PASSWORD}`,
        port: `${process.env.JOYSTICK_DB_PORT}`,
        ssl: true,
    });

const local_connection = new Pool
    ({
        user: `${process.env.LOCAL_USER_DB}`,
        host: `${process.env.LOCAL_HOST}`,
        database: `${process.env.LOCAL_DATABASE}`,
        password: `${process.env.LOCAL_PASSWORD}`,
        port: `${process.env.LOCAL_DB_PORT}`,
    });


function joystick_client() {
    joystick_connection.connect((err, client) => {
        if (err) {
            console_log(`Free To Play : Error connecting to {${process.env.JOYSTICK_HOST}}`);
            setTimeout(joystick_client, 60000);
        } else {
            console_log(`Free To Play : Successfully connected to {${process.env.JOYSTICK_HOST}}`);
        }
    });
}

function local_client() {
    local_connection.connect((err, client) => {
        if (err) {
            console_log(`Free To Play : Error connecting to {${process.env.LOCAL_HOST}}`);
            setTimeout(local_client, 60000);
        } else {
            console_log(`Free To Play : Successfully connected to {${process.env.LOCAL_HOST}}`);
        }
    });
}


joystick_connection.on('error', (err) => {
    console_log('Free To Play : Joystick Database error',err);
    setTimeout(joystick_client, 60000);
});

local_connection.on('error', (err) => {
    console_log('Free To Play : Local connection error',err);
    setTimeout(local_client, 60000);
});



joystick_client();
local_client();





module.exports = { joystick_connection, local_connection,joystick_client};