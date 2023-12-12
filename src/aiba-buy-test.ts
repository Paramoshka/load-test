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
        createcontent: {
            exec: 'createContent',
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: 1,
            maxDuration: '10s',

        },
        createChannels: {
            exec: 'createChannels',
            executor: 'shared-iterations',
            vus: 1,
            iterations: 10,
            startTime: '10s',
            maxDuration: '20s'
        },
        // createChannels: {
        //     exec: 'createChannels',
        //     executor: 'per-vu-iterations',
        //     vus: 1,
        //     iterations: 1,
        //     maxDuration: '60s'
        // },
        buy: {
            exec: 'buy',
            startTime: '30s',
            executor: 'constant-arrival-rate',
            rate: 350,
            timeUnit: '1s', // 1000 iterations per second, i.e. 1000 RPS
            duration: '900s',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 1000, // if the preAllocatedVUs are not enough, we can initialize more
        },
        // buy: {
        //     exec: 'buy',
        //     startTime: '30s',
        //     executor: 'per-vu-iterations',
        //     vus: 5,
        //     iterations: 2,
        //     maxDuration: '60s'
        // }

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
const API_KEY: string = 'aea3c531-f949-400c-a670-9c999187bfd5';
const OPERATOR_ID = '1fb1b4c7-dbd9-469e-88a2-c207dc195869';
//let ids: { [x: string]: any; } = {};


function getToken() {
    //get token
    if (undefined === params['token']) {
        const getToken = http.post(
            `${API_URL}/api/dashboard/auth/access-token`,
            {
                "apiKey" : `${API_KEY}`
            }
        );
        params['token'] = {
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type':  'application/json',
                Authorization: `Bearer ${getToken.json('accessToken')}`,
            },
            cookies: getToken.cookies,
        }
       // console.log(getToken.body)
    }

    return params['token'];
}

export function createContent() {

    //console.log(params['token']);
    sleep(1);
    //create category
    const createCategory = http.post(

        `${API_URL}/api/dashboard/categories`,
        JSON.stringify({
            "published": 'true',
            "mode": 'regular',
            "os": [],
            "title": "Demo",
            "externalId": '',
            "locales": '{}',
            "type": 'channel'
        }),
        getToken()
    )
    check(createCategory, {
        'category is created': (res) => res.json('id') != undefined
    });
    params['categoryId'] = createCategory.json('id');
    sleep(1);

    //
    const createPackage = http.post(
        `${API_URL}/api/dashboard/packages`,
        JSON.stringify({
            "title": `${uuidv4()}`
        }),
        getToken()
    );
    check(createPackage, {
        'Package is created': (res) => res.json('id') != undefined
    });
    params['packageId'] = createPackage.json('id');
    sleep(2);
    //create plan
    const createPlan = http.post(
        `${API_URL}/api/dashboard/plans`,
        JSON.stringify({
            "categories": [],
            "users": [],
            "roles": [],
            "externalId": "",
            "description": "",
            "os": [],
            "maxConcurrentConnections": 0,
            "npvrLimit": 0,
            "packageId": `${params['packageId']}`,
            "title": `${randomString(10, `aeioubcdfghijpqrstuv`)}`,
            "renewSubscriptions": true,
            "published": true,
            "locales": {}
        }),
        getToken()
    );
    check(createPlan, {
        'Plan is created': (res) => res.json('id') != undefined
    });
    params['planId'] = createPlan.json('id');
    sleep(1);
    //
    const createOffers = http.post(
        `${API_URL}/api/dashboard/offers`,
        JSON.stringify({
            "url": "",
            "discounts": [],
            "price": '1',
            "intervalType": "month",
            "intervalLength": '1',
            "published": 'true',
            "planId": `${params['planId']}`
        }),
        getToken()
    );
    check(createOffers, {
        'Offer is created': (res) => res.json('id') != undefined
    });
    sleep(1);
    const createStripe = http.post(
        `${API_URL}/api/dashboard/plugininstances`,
        JSON.stringify({
            "pluginId": 'd66dbb8b-53e3-4f20-91cb-dc65e6e105b2',
            "title": "Stripe Payment System"
        }),
        getToken()
    );

    check(createStripe, {
        'stripe is created': (res) => res.json('id') != undefined
    });
    //console.log(createStripe.body);
    sleep(1);

}


function getPackageIds() {
    if (params['packageIds'] === undefined) {
        const getPackages = http.get(
            `${API_URL}/api/dashboard/packages`,
            getToken()
        )
        // @ts-ignore
        let arr: [x: string] = getPackages.json('rows');
        let idsPackages: [x: string] = [];
       // @ts-ignore
        arr.forEach((value, index) => {
            let s: string = `${value['id']}`;
            idsPackages.push(s)
        })
        params['packageIds'] = idsPackages;
    }
   // console.log(params['packageIds']);
    return params['packageIds'];
}

function getCategoriesIds() {
    if (params['categoryIds'] === undefined) {
        const getPackages = http.get(
            `${API_URL}/api/dashboard/categories`,
            getToken()
        )

        let arr: [x: string] = getPackages.json('rows');
        // @ts-ignore
        let idsCategories: [x: string] = [];
      // @ts-ignore
        arr.forEach((value, index) => {
            let s: string = `${value['id']}`;
            idsCategories.push(s)
        })

        params['categoryIds'] = idsCategories;
    }
   // console.log(params['categoryIds']);
    return params['categoryIds'];
}

export  function createChannels() {

    const createChannel =  http.post(
        `${API_URL}/api/dashboard/contents`,
        JSON.stringify({
            "published": true,
            "availableWithoutPurchase": false,
            "showToDemoUsers": false,
            "title": "DemoNew11111",
            "props": {
                "keyCode": "",
                "epg": {
                    "url": "",
                    "id": "",
                    "timeShift": "",
                    "duration": 86400,
                    "pluginInstanceId": null
                }
            },
            "ageLimit": 0,
            "os": [],
            "categories": getCategoriesIds(),
            "packages": getPackageIds(),
            "duration": 0,
            "shared": [],
            "externalId": "",
            "contentOwnerId": null,
            "geoIpId": null,
            "locales": {},
            "type": "channel"
        }),
        getToken()
    );

    check(createChannel, {
        'channel is created': (res) => res.json('id') != undefined
    });
   // console.log(createChannel.body);
}

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
function getPlanId(username: string) {
    if (params['planId'] === undefined) {
        const planId = http.get(`${API_URL}/api/player/plans?language=en&operator_id=${OPERATOR_ID}&device_id=176C93F7BF7F08A3A188BF678865FEA3&density=1&client=browser&platform=web&os=linux&page=1&per_page=10`,
            getLogin(username));
        // @ts-ignore
       // params['planId'] = planId.json('content.data')[0]['id'];
        params['planId'] = (planId.json('content.data') as JSONArray).pop()['id'];
    }
    return params['planId']
}
//
function getOfferId(username: string) {
    if (undefined === params['offerId']) {
        const offerId = http.get(`${API_URL}/api/player/plan-info/${getPlanId(username)}?language=en&operator_id=${OPERATOR_ID}&device_id=176C93F7BF7F08A3A188BF678865FEA3&density=1&client=browser&platform=web&os=linux`,
            getLogin(username));
        params['offerId'] = offerId.json('content.offers')[0]['id'];
        //params['offerId'] = (offerId.json('content.offers') as JSONArray).pop()['id']; //last index
        //console.log((offerId.json('content.offers') as JSONArray).pop()['id'])
    }
    return params['offerId'];
}
//
function getPaymentSystem(username: string) {
    if (undefined === params['payId']) {
        const payId = http.get(`${API_URL}/api/player/payment-systems?language=en&operator_id=${OPERATOR_ID}&device_id=176C93F7BF7F08A3A188BF678865FEA3&density=1&client=browser&platform=web&os=linux`,
            getLogin(username)
        );
        params['payId'] = payId.json('content.data')[0]['id'];
    }

    return params['payId'];
}

function  paymentHook(transactionId: string, username: string) {
    const paid = http.post(
      `${API_URL}/api/player/hook/${getPaymentSystem(username)}`,
        JSON.stringify({
            "transactionId": transactionId,
            "testMode": true
        }),
        getLogin(username)
    );
    try {
        check(paid, {
            'payments is ok': (res) => res.json('message') === "OK"
        });
    }catch (e) {
        console.log(e);
    }
}
export function buy() {
    const username =  execution.scenario.iterationInTest + "username";
    //buy with stripe
    const stripe = http.post(
        `${API_URL}/api/player/pay`,
        JSON.stringify({
            "offerId": getOfferId(username),
            "planId": getPlanId(username),
            "type": "subscription",
            "paymentSystemId": getPaymentSystem(username),
            "language": "en",
            "operator_id": `${OPERATOR_ID}`,
            "device_id": "176C93F7BF7F08A3A188BF678865FEA3",
            "density": 1,
            "client": "browser",
            "platform": "web",
            "os": "linux",
            "testMode": true
        }),
        getLogin(username)
    );
    updateCookie(username, stripe);
    check(stripe, {
        'stripe: ': (res) => res.json('content.paymentTransactionId') != undefined
    });
    let tr = stripe?.json('content.paymentTransactionId');
    paymentHook(tr.toString(), username);
}