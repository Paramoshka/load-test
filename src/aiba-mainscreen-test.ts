import {check, JSONArray, JSONObject, sleep} from "k6";
import {Options} from 'k6/options';

/* @ts-ignore */
//import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';
import http from 'k6/http'
import {Counter} from 'k6/metrics';
import {uuidv4} from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import {randomString} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import execution from "k6/execution";


//vars
const PROJECT_ID = 3672363;

export const CounterErrors = new Counter('Errors');
export const options: Options = {

    thresholds: {
        'Errors': ['count<1'],
    },
    scenarios: {
        mainscreen: {
            exec: 'homeScreenLogin',
            executor: 'constant-arrival-rate',
            rate: 250,
            timeUnit: '1s', // 1000 iterations per second, i.e. 1000 RPS
            duration: '900s',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 1000, // if the preAllocatedVUs are not enough, we can initialize more
        },
        mainscreenAnonim: {
            exec: 'homeScreenAnonim',
            executor: 'constant-arrival-rate',
            rate: 900,
            timeUnit: '1s', // 1000 iterations per second, i.e. 1000 RPS
            duration: '900s',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 1000, // if the preAllocatedVUs are not enough, we can initialize more
        },

    },
    ext: {
        loadtest: {
            projectID: PROJECT_ID,
            name: "API-TEST"
        }
    },
}


//let ids: { [x: string]: any; } = {};
const params: { [login: string]: any } = {};
const API_URL: string = 'http://eksweb.telebreeze.com';
//const API_KEY: string = 'aea3c531-f949-400c-a670-9c999187bfd5';
const OPERATOR_ID = '1fb1b4c7-dbd9-469e-88a2-c207dc195869';
//let ids: { [x: string]: any; } = {};

function getLogin(username: string) {
    if (params[username] === undefined) {
        const login = http.post(
            `${API_URL}/api/authorization/login`,
            {
                "language": "ru",
                "operator_id":  `${OPERATOR_ID}`,
                "device_id": "5064810CBF9E6D132536BA824BF085E4",
                "density": 1,
                "client": "browser",
                "platform": "web",
                "os": "linux",
                "login": `${username}`,
                "password": "1111"
            },
        );
        params[username] = {
            headers: {
                'Content-Type':  'application/json',
                Authorization: `Bearer ${login.json('content.token.access_token')}`,
            },
            cookies: login.cookies,
        }
    }
    return params[username]
}
function updateCookie(login: string, response: any) {
    if (undefined === params[login].cookies || Object.keys(response.cookies).length > 0) {
        params[login].cookies = response.cookies;
        // console.log(params[login].cookies)
        // console.log(login)
        // console.log(response.headers['X-Tbhost'])
    }
}
//
export function homeScreenLogin() {
    const username =  execution.scenario.iterationInTest + "username";
    const announce = http.get(`${API_URL}/api/player/announces?device_id=123&os=linux&platform=mobile&language=en&density=1&operator_id=${OPERATOR_ID}`,
        getLogin(username));
    updateCookie(username, announce);
    check(announce, {
        'announce': (res) => res.status === 200
    });
   // console.log(announce.body);
    //
    const categories = http.get(`${API_URL}/api/player/categories?device_id=123&os=linux&platform=mobile&language=en&density=1&display_on_main_screen=true&page=1&per_page=4&operator_id=${OPERATOR_ID}`,
        getLogin(username));
    updateCookie(username, categories);
    check(categories, {
       'categories': (res) => res.status === 200
    });
  //  console.log(categories.body);
}

export function homeScreenAnonim() {
   // const username =  execution.scenario.iterationInTest + "username";
    const announce = http.get(`${API_URL}/api/player/announces?device_id=123&os=linux&platform=mobile&language=en&density=1&operator_id=${OPERATOR_ID}`,);

    check(announce, {
        'announce': (res) => res.status === 200
    });
    //console.log(announce.body);
    //console.log(announce.headers['X-Tbhost'] + ` ${username}`);

    const categories = http.get(`${API_URL}/api/player/categories?device_id=123&os=linux&platform=mobile&language=en&density=1&display_on_main_screen=true&page=1&per_page=4&operator_id=${OPERATOR_ID}`,
        {
            headers: {
                'Content-Type':  'application/json',
            },
            cookies: announce.cookies,
        });

    check(categories, {
        'categories': (res) => res.status === 200
    });
    //console.log(categories.body);
    //console.log(categories.headers['X-Tbhost'] + ` ${username}`);
}
