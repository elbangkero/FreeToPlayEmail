

const path = require('path');
const fs = require('fs');
const logFilePath = path.join('./logs', `${getCurrentDate()}.log`);
var dir = './logs';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// Redirect console output to a file
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
console_log = function (message) {
    logStream.write(`${new Date().toISOString()}: ${message}\n`);
    process.stdout.write(`${new Date().toISOString()}: ${message}\n`);
};


function getCurrentDate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    return formattedDate;
}



module.exports = console_log;