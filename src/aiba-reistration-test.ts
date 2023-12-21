import {check} from "k6";
import {Options} from 'k6/options';

/* @ts-ignore */
//import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';
import http, {RefinedResponse} from 'k6/http'
import {Counter} from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import execution from "k6/execution";


//vars
//const URL_AUTHORIZATION = 'http://eksweb.telebreeze.com/api/authorization';
const URL_AUTHORIZATION = 'https://127-80.dev.telebreeze.com/api/authorization';
const PROJECT_ID = 3621321;

export const CounterErrors = new Counter('Errors');
export const options: Options = {

    thresholds: {
        'Errors': ['count<1'],
    },
    scenarios: {
        apitest: {
            exec: 'apitest',
            executor: 'constant-arrival-rate',
            rate: 500,
            timeUnit: '1s', // 1000 iterations per second, i.e. 1000 RPS
            duration: '900s',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 500, // if the preAllocatedVUs are not enough, we can initialize more
        },
    },
    ext: {
        loadtest: {
            projectID: PROJECT_ID,
            name: "API-TEST"
        }
    },
}


let ids: { [x: string]: any; } = {};
const params: { [login: string]: any } = {};

function getParams(username: string, email: string) {

    if (ids['operatorId'] === undefined) {
        ids['operatorId'] = '1fb1b4c7-dbd9-469e-88a2-c207dc195869';
    }

    const registration = http.post(
        `${URL_AUTHORIZATION}/register`,
       {
            "language": `en`,
            "operator_id": `${ids['operatorId']}`,
            "device_id": `176C93F7BF7F08A3A188BF678865FEA3`,
            "density": `1`,
            "client": `browser`,
            "platform": `web`,
            "os": `linux`,
            "firstName": `ivan1`,
            "username": `${username}`,
            "email": `${email}`,
            "password": `1111`,
            "repeatPassword": `1111`,
            "testMode": true
        }
    );
    console.log(registration.body);

    return params[`${username}`] = {
        "userId" : `${registration.json('content.user_id')}`,
        "emailVerificationToken": `${registration.json('content.emailVerificationToken')}`,
        "device_id": `1`,
        "platform": `mobile`,
        "os": `browser`,
        "testMode": true
    };
}
export function apitest() {
    // const username = 'tushkan' + execution.vu.idInTest
    // const email = `parfenov${execution.vu.idInTest}@mail.ru`
   // const username = uuidv4();
    const username = execution.scenario.iterationInTest + "username";
    const email = uuidv4() + "@mail.ru";
    //console.log(email);
    //confirm email
    const confirm = http.post(
        `${URL_AUTHORIZATION}/activate-profile`,
        getParams(username, email)
    );
    console.log(confirm.body);
    check(confirm, {
        'profile is activated': (res) => res.json('code') === 1,
    });
    // console.log(confirm.request)
    // console.log(confirm.body)
}

