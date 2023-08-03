const { local_connection } = require('../utils/db_connection');
const multer = require('multer');
const axios = require('axios');
const https = require('https');
var interval = 3000;

const MAX_VERIFICATION_ATTEMPTS = 4;
let VERIFICATION_INTERVAL = 120000;

let verificationAttempts = 1;

(async () => {
    const client = await local_connection.connect();
    await client.query('LISTEN ftp_listener');
    client.on('notification', function (data) {
        getConfig(parseInt(data.payload));
        //console.log("data", JSON.parse(data.payload));
        function getConfig(dataload) {
            local_connection.query(`SELECT * FROM ftp_email where triggerstatus='active' and sending ='true' and status !='sending'`).then(res => {
                const data = res.rows;
                console_log(`Config queue count : ${res.rowCount}`);

                console_log(`payload : ${dataload}`);
                const callback = dataload == res.rowCount;
                if (callback) {
                    data.forEach(function (el, index) {

                        setTimeout(async function () {
                            const utf8encoded = (new Buffer.from(el.payload, 'base64')).toString('utf8');
                            //console.log(utf8encoded);
                            const obj = JSON.parse(utf8encoded);

                            const merge_data = obj.merge ? obj.merge : '';
                            if (merge_data.merge_type == 'f2p_lock_email') {
                                local_connection.query(`update ftp_email set triggerstatus= 'inactive' , status = 'sent' where id=${el.id}`, async (err, res) => {
                                    sendEmailResponse = await sendEmail(obj.from, obj.email, obj.subject, obj.templateID, obj.fromName, merge_data)
                                        .then(function (response) {
                                            const throttled = JSON.parse(response);
                                            if (throttled.status == 'Throttled') {
                                                StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'pending', response);
                                            } else {
                                                StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'success', response);
                                            }
                                        }).catch(function (error) {
                                            StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'failed', error);
                                        });
                                    if (err) {
                                        console_log(`sendEmail[Error]: ${err.message}`);
                                    }
                                });
                                console_log('Account has been locked');
                            } else if (merge_data.merge_type == 'f2p_verify_email') {
                                local_connection.query(`update ftp_email set is_verified=1,triggerstatus= 'inactive' , status = 'sent' where id=${el.id}`, async (err, res) => {
                                    sendEmailResponse = await sendEmail(obj.from, obj.email, obj.subject, obj.templateID, obj.fromName, merge_data)
                                        .then(function (response) {
                                            const throttled = JSON.parse(response);
                                            if (throttled.status == 'Throttled') {
                                                StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'pending', response);
                                            } else {
                                                StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'success', response);
                                            }
                                        }).catch(function (error) {
                                            StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'failed', error);
                                        });
                                    if (err) {
                                        console_log(`sendEmail[Error]: ${err.message}`);
                                    }
                                });
                                console_log('Email Verification');
                            } else if (merge_data.merge_type == 'f2p_reset_password') {
                                local_connection.query(`update ftp_email set triggerstatus= 'inactive' , status = 'sent' where id=${el.id}`, async (err, res) => {
                                    sendEmailResponse = await sendEmail(obj.from, obj.email, obj.subject, obj.templateID, obj.fromName, merge_data)
                                        .then(function (response) {
                                            const throttled = JSON.parse(response);
                                            if (throttled.status == 'Throttled') {
                                                StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'pending', response);
                                            } else {
                                                StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'success', response);
                                            }
                                        }).catch(function (error) {
                                            StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'failed', error);
                                        });
                                    if (err) {
                                        console_log(`sendEmail[Error]: ${err.message}`);
                                    }
                                });
                                console_log('Password Reset');
                            } else {

                                local_connection.query(`update ftp_email set is_verified=1,triggerstatus='inactive', status='sent' where id=${el.id}`, async (err, res) => {
                                    await sendEmail(obj.from, obj.email, obj.subject, obj.templateID, obj.fromName, merge_data)
                                        .then(async function (response) {
                                            const throttled = JSON.parse(response);
                                            if (throttled.status == 'Throttled') {
                                                StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'pending', response);
                                            } else {
                                                StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'success', response);
                                            }
                                            console_log(`Status : ${obj.token} Sent, ` + `Campaign : FreeToPlay Email`);

                                            await emailVerification(obj.email)
                                                .then(function (response) {
                                                    console_log(`Email verified. Stopping the verification process.`);

                                                })
                                                .catch(function (error) {
                                                    //console.log('ERROR:', JSON.stringify(error.data));

                                                    setTimeout(async () => {
                                                        await sendEmailWithVerification(el.id, obj.from, obj.name, obj.email, obj.subject, obj.templateID, obj.fromName, merge_data, el.id, obj.token, verificationAttempts);
                                                    }, VERIFICATION_INTERVAL);
                                                })
                                                .finally(async function () {

                                                });

                                        }).catch(function (error) {
                                            //console.log(error);
                                            console_log(`Status : ${obj.token} Failed, ` + `Campaign : FreeToPlay Email`);
                                            StoreFTPEmailHistory(el.id, obj.name, obj.email, obj.token, obj.from, obj.fromName, obj.subject, obj.templateID, JSON.stringify(obj.merge), 'failed', error);
                                        }).finally(async function () {
                                            local_connection.query(`update ftp_email set triggerstatus= 'inactive' , status = 'sent' where id=${el.id}`, (err, res) => {
                                                if (err) {
                                                    console_log(`sendEmail[Error]: ${err.message}`);
                                                }
                                            });
                                        });
                                    if (err) {
                                        console_log(`sendEmail[Error]: ${err.message}`);
                                    }
                                });

                            }

                        }, index * interval);
                    })

                }

            })
        }


    });


})();

async function emailVerification(email) {

    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        url: `https://172.31.1.12:8069/emailsender/api/1?email=${email}`,
        headers: {
            'Authorization': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2NzkzODc4NDYsImp0aSI6InVMMTNaVG1ETndjRVh1TlF0dm43Y3c9PSIsImlzcyI6IiIsIm5iZiI6MTY3OTM4Nzg0NiwiZXhwIjoxNjc5Mzg4MjA2LCJkYXRhIjp7InVzZXJuYW1lIjoicmFpbiIsInBhc3N3b3JkIjoicG9naTY5Iiwic2l0ZV9rZXkiOiJxcXFxcTY5In19.vmVRS4_aaBGvx_kCQO_lga7LWgAFUgGWmLyWeIrLBBc',
            'Cookie': 'ci_session=qiie2l6mtsu39pe6mk1ie7tn83srb4om; ci_session=3qebtnrctcekndkrbmhl72peno56bs56; ci_session=mu2rfjorbt95nbgqpu0jncf9mu807nla'
        }
    };
    return new Promise(async (resolve, reject) => {
        axios.request(config)
            .then((response) => {
                if (response.data.code == '200') {
                    if (response.data.data.is_verified == false) {
                        reject(response);
                    } else {
                        resolve(response);
                    }
                }
                else {
                    reject(response);
                }

            })
            .catch((error) => {
                reject(error);
            });
    });

}



async function sendEmailWithVerification(email_id, from, name, email, subject, template_id, fromName, merge_data, config_id, token, verificationAttempts) {


    await emailVerification(email)
        .then(async function (response) {

            console_log(`Email verified. Stopping the verification process.`);
            await local_connection.query(`update ftp_email set is_verified=1,triggerstatus='inactive', status='sent' where id=${config_id}`);

        })
        .catch(async function (error) {
            if (verificationAttempts < MAX_VERIFICATION_ATTEMPTS) {
                console_log(`Sending another email because the user's email has not yet been verified`);

                await local_connection.query(`update ftp_email set email_attempt = ${verificationAttempts}, triggerstatus='inactive', status='sent' where id=${config_id};`);
                let sendEmailResponse = '';
                switch (verificationAttempts) {
                    case 1: //1st attempt

                        var transactionID = await getElasticEmailTransacID(email_id, 'F2PLCHJP VE');
                        await elasticSendingCallback(transactionID)
                            .then(async function (response_validated) {

                                const throttled = JSON.parse(response_validated);
                                if (throttled.status == 'Throttled') {
                                    StoreFTPEmailHistory(config_id, name, email, token, from, fromName, '2nd Day Email Verification', 'F2PLCHJP 2DVE', JSON.stringify(merge_data), 'pending', response_validated);
                                    return response_validated;
                                } else {
                                    sendEmailResponse = await sendEmail(from, email, '2nd Day Email Verification', 'F2PLCHJP 2DVE', fromName, merge_data)
                                        .then(function (response) {
                                            StoreFTPEmailHistory(config_id, name, email, token, from, fromName, '2nd Day Email Verification', 'F2PLCHJP 2DVE', JSON.stringify(merge_data), 'success', response);
                                            verificationAttempts++;
                                            return response;
                                        }).catch(function (error) {
                                            StoreFTPEmailHistory(config_id, name, email, token, from, fromName, '2nd Day Email Verification', 'F2PLCHJP 2DVE', JSON.stringify(merge_data), 'failed', error);
                                            return error;
                                        });
                                }
                            });
                        break;
                    case 2: //2nd attempt
                        var transactionID = await getElasticEmailTransacID(email_id, 'F2PLCHJP 2DVE');
                        await elasticSendingCallback(transactionID)
                            .then(async function (response_validated) {
                                const throttled = JSON.parse(response_validated);
                                if (throttled.status == 'Throttled') {
                                    StoreFTPEmailHistory(config_id, name, email, token, from, fromName, '3rd Day Email Verification', 'F2PLCHJP 3DVE', JSON.stringify(merge_data), 'pending', response_validated);
                                    return response_validated;
                                } else {
                                    sendEmailResponse = await sendEmail(from, email, '3rd Day Email Verification', 'F2PLCHJP 3DVE', fromName, merge_data)
                                        .then(function (response) {
                                            StoreFTPEmailHistory(config_id, name, email, token, from, fromName, '3rd Day Email Verification', 'F2PLCHJP 3DVE', JSON.stringify(merge_data), 'success', response);
                                            verificationAttempts++;
                                            return response;
                                        }).catch(function (error) {
                                            StoreFTPEmailHistory(config_id, name, email, token, from, fromName, '3rd Day Email Verification', 'F2PLCHJP 3DVE', JSON.stringify(merge_data), 'failed', error);
                                            return error;
                                        });
                                }
                            });

                        break;


                    case 3: //3rd attempt

                        var transactionID = await getElasticEmailTransacID(email_id, 'F2PLCHJP 3DVE');
                        await elasticSendingCallback(transactionID)
                            .then(async function (response_validated) {
                                const throttled = JSON.parse(response_validated);
                                if (throttled.status == 'Throttled') {
                                    StoreFTPEmailHistory(config_id, name, email, token, from, fromName, '4th Day Email Verification', 'F2PLCHJP 4DVE', JSON.stringify(merge_data), 'pending', response_validated);
                                    return response_validated;
                                } else {
                                    sendEmailResponse = await sendEmail(from, email, '4th Day Email Verification', 'F2PLCHJP 4DVE', fromName, merge_data)
                                        .then(function (response) {
                                            StoreFTPEmailHistory(config_id, name, email, token, from, fromName, '4th Day Email Verification', 'F2PLCHJP 4DVE', JSON.stringify(merge_data), 'success', response);
                                            verificationAttempts++;
                                            return response;
                                        }).catch(function (error) {
                                            StoreFTPEmailHistory(config_id, name, email, token, from, fromName, '4th Day Email Verification', 'F2PLCHJP 4DVE', JSON.stringify(merge_data), 'failed', error);
                                            return error;
                                        });
                                }
                            });

                        break;




                }
                const EmailResponse = sendEmailResponse.data == null ? false : sendEmailResponse.data.success;
                //console.log(EmailResponse);

                if (EmailResponse) {
                    console_log(`Status : ${token} Sent, ` + `Campaign : FreeToPlay Email`);

                    let isVerified = false;

                    async function verifyEmail(attempts) {
                        try {
                            const emailVerificationResponse = await emailVerification(email);

                            await local_connection.query(`update ftp_email set is_verified=1,triggerstatus='inactive', status='sent' where id=${config_id}`);

                            console_log(`Email verified. Stopping the verification process.`);
                            isVerified = true;
                            return true;
                        } catch (error) {
                            //console.log('ERROR Verify attempt:', JSON.stringify(error.data));

                            if (attempts < MAX_VERIFICATION_ATTEMPTS) {
                                return new Promise((resolve) => {
                                    setTimeout(() => {
                                        resolve(verifyEmail(attempts + 1));
                                    }, VERIFICATION_INTERVAL);
                                });
                            }
                        }

                        return false;
                    }

                    await verifyEmail(verificationAttempts + 1);

                    if (isVerified) {
                        return;
                    }

                }
                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(sendEmailWithVerification(email_id, from, name, email, subject, template_id, fromName, merge_data, config_id, token, verificationAttempts));
                    }, VERIFICATION_INTERVAL);
                });
            } else {
                console_log(`Maximum verification attempts reached. No more email attempts.`);
                await emailAttemptLock(email);
            }
        })


}

async function elasticSendingCallback(transactionID) {
    const parse_transacID = String(transactionID);

    const apikey = process.env.ELASTIC_API_KEY;
    return new Promise(async (resolve, reject) => {
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://api.elasticemail.com/v2/email/getstatus?apikey=${apikey}&transactionID=${parse_transacID}&showFailed=true&showSent=true&showDelivered=true&showPending=true&showOpened=true&showClicked=true&showAbuse=true&showUnsubscribed=true&showErrors=true&showMessageIDs=true`,
            headers: {}
        };

        axios.request(config)
            .then((response) => {
                if (response.data.data.deliveredcount !== 0) {
                    const __json = new Object();
                    __json.id = response.data.data.id;
                    __json.status = 'Sent';
                    __json.to = response.data.data.delivered;
                    const apiResponse = JSON.stringify(__json);
                    resolve(apiResponse);
                } else if (response.data.data.failedcount !== 0) {
                    const __json = new Object();
                    __json.id = response.data.data.id;
                    __json.status = 'Failed';
                    __json.error_message = response.data.data.failed;
                    const apiResponse = JSON.stringify(__json);
                    reject(apiResponse);
                } else if (response.data.data.pendingcount !== 0) {
                    const __json = new Object();
                    __json.id = response.data.data.id;
                    __json.status = 'Throttled';
                    __json.message = 'Waiting to retry';
                    const apiResponse = JSON.stringify(__json);
                    resolve(apiResponse);
                }
            })
            .catch((error) => {
                //console.log(error);
                console.log(error);
                reject(error);
            });

    });

}



async function sendEmail(from, email, subject, template_id, fromName, merge_data) {


    const apikey = process.env.ELASTIC_API_KEY;
    const email_subject = subject ? encodeURIComponent(subject) : encodeURIComponent('(no subject)');
    const encodedfromName = encodeURIComponent(fromName);
    var merge_params = "";
    for (const key in merge_data) {
        merge_params += `&${key}=${merge_data[key]}`;
    }

    return new Promise(async (resolve, reject) => {

        var config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://api.elasticemail.com/v2/email/send?subject=${email_subject}&fromName=${encodedfromName}&from=${from}&to=${email}&template=${template_id}&isTransactional=true&apikey=${apikey}&${merge_params}`,
            headers: {}
        };


        axios(config)
            .then(async function (response) {
                /*
                if (response.data.success)
                    resolve(response);
                else
                    reject(response);*/
                //console.log(response.data.data.transactionid);
                //console.log(response.data);
                try {
                    setTimeout(async function () {
                        await elasticSendingCallback(response.data.data.transactionid)
                            .then(function (response) {
                                resolve(response);
                                //console.log('Sent Successfully', response);
                            }).catch(function (error) {
                                reject(error);
                                //console.log('Sending Failed', error);
                            });
                    }, 10000);
                } catch (error) {
                    console_log(error);
                    console.log(error);
                }


            })
            .catch(function (error) {
                reject(error);
                console.log(error);
            });

    });

}

async function StoreFTPEmailHistory(email_id, name, email, token, from, fromname, subject, template_id, merge, status, api_response) {


    let local_time = new Date().toISOString();
    const date_now = new Date(local_time).toLocaleString();
    local_connection.query(`INSERT INTO ftp_email_history (email_id,name,email,token,"from",fromname,subject,template_id,merge,status,api_response,created_at,updated_at) VALUES ('${email_id}','${name}','${email}','${token}','${from}','${fromname}','${subject}','${template_id}','${merge}','${status}','${api_response}','${date_now}','${date_now}')`, (err, res) => {
        if (err) {
            console_log(`StoreFTPEmailHistory[Error]:  ${err}`);
        }
    });
}


async function emailAttemptLock(email) {
    return new Promise(async (resolve, reject) => {
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            url: 'https://172.31.1.12:8069/Emailsender/api/',
            headers: {
                'Authorization': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2NzkzODc4NDYsImp0aSI6InVMMTNaVG1ETndjRVh1TlF0dm43Y3c9PSIsImlzcyI6IiIsIm5iZiI6MTY3OTM4Nzg0NiwiZXhwIjoxNjc5Mzg4MjA2LCJkYXRhIjp7InVzZXJuYW1lIjoicmFpbiIsInBhc3N3b3JkIjoicG9naTY5Iiwic2l0ZV9rZXkiOiJxcXFxcTY5In19.vmVRS4_aaBGvx_kCQO_lga7LWgAFUgGWmLyWeIrLBBc',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'ci_session=7g0je7hbi3m7t0ci8u9aptsesg2emulm; ci_session=op66fru2jakdqclm23hn217n4n2o54ta'
            },
            data: { 'id': '1', 'email': email }
        };

        axios.request(config)
            .then((response) => {
                if (response.data.code == '200') {
                    resolve(response);
                }
            })
            .catch((error) => {
                reject(error);
            });
    });
}

async function getElasticEmailTransacID(email_id, template_id) {

    const query_transac = await local_connection.query(`select api_response  from ftp_email_history where email_id = '${email_id}' and template_id = '${template_id}';`);
    const _json_parse = JSON.parse(JSON.stringify(query_transac.rows));
    const _response = _json_parse[0].api_response;
    const _trasac_id = JSON.parse(_response);
    return _trasac_id.id;
}

const multerStorage = multer.diskStorage({

    destination: (req, file, cb) => {
        if (file.fieldname === "data_leads") {
            cb(null, './uploads/data_leads');
        }
    },

    filename: (req, file, cb) => {
        if (file.fieldname === "data_leads") {
            cb(null, `${Date.now()}_${file.originalname}`)
        }
    }
});
const multerFilter = (req, file, cb) => {
    if (file.fieldname === "data_leads") {
        if (!file.originalname.match(/\.csv$|\.xlsx$/)) {
            // upload only png and jpg format
            return cb(new Error('Please upload a CSV or xlsx file only'))
        }
        cb(null, true)
    }


};
upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

insertEmailRequest = async (_req, _res) => {
    let local_time = new Date().toISOString();
    const date_now = new Date(local_time).toLocaleString();

    local_connection.query(`INSERT INTO ftp_email (status,triggerstatus,sending,payload,created_at,updated_at,is_verified,email_attempt) VALUES ('pending','active','${_req.body.sending}','${_req.body.payload}','${date_now}','${date_now}',0,0)`, (err, res) => {
        if (err) {
            console_log(`insertEmailRequest[Error]: ${err.message}`);
        } else {
            console_log(JSON.stringify({ 'statusCode': 200, 'status': true, message: 'Request Added', 'data': [] }));
            _res.status(200).json({ 'statusCode': 200, 'status': true, message: 'Request Added', 'data': [] });
        }
    });

}


module.exports = function (app) {

    app.post('/ftp-upload', upload.fields([]), insertEmailRequest);


};