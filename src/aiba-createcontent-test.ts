import {check, JSONArray, JSONObject, sleep} from "k6";
import {Options} from 'k6/options';

/* @ts-ignore */
//import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';
import http from 'k6/http'
import {Counter} from 'k6/metrics';
import {uuidv4} from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import {randomString} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import execution from "k6/execution";
import "https://raw.githubusercontent.com/facebook/regenerator/main/packages/runtime/runtime.js"


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
            iterations: 100,
            startTime: '10s'
        },
        createVideos: {
            exec: 'createVideosNoPurchase',
            executor: 'shared-iterations',
            vus: 1,
            iterations: 900,
            startTime: '10s'
        }

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
const API_URL: string = 'http://aibaweb.telebreeze.com';
const API_KEY: string = '20391d42-205b-424c-a922-c49d6d89343f';
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
    //create video category
    const createVideoCategory = http.post(

        `${API_URL}/api/dashboard/categories`,
        JSON.stringify({
            "published": 'true',
            "mode": 'regular',
            "os": [],
            "title": "Demo",
            "externalId": '',
            "locales": '{}',
            "type": 'video'
        }),
        getToken()
    )
    check(createVideoCategory, {
        'video category is created': (res) => res.json('id') != undefined
    });
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

function getCategoriesIds(type: string) {
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
            if (value['type'] == type) {
                let s: string = `${value['id']}`;
                idsCategories.push(s)
            }

        })

        params['categoryIds'] = idsCategories;
    }
   // console.log(params['categoryIds']);
    return params['categoryIds'];
}

export async function createChannels() {

    let random_boolean = Math.random() < 0.5;

    const createChannel =  http.asyncRequest(
        "POST",
        `${API_URL}/api/dashboard/contents`,
        JSON.stringify({
            "published": true,
            "availableWithoutPurchase": random_boolean,
            "showToDemoUsers": false,
            "title": "DemoNewNEW",
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
            "categories": getCategoriesIds("channel"),
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

    createChannel.then(
        res => {
            check(res, {
                'channel is created': (res) => res.json('id') != undefined
            });
            addTracks(res.json('id'), "channel");
        }
    );
}

async function addTracks(contentId: string, type: string) {
    const track = http.post(
        `${API_URL}/api/dashboard/tracks`,
        JSON.stringify({
            "published": true,
            "type": type,
            "contentId": contentId,
            "commercialId": null,
            "props": {},
            "pluginInstanceId": null,
            "uri": uuidv4(),
            "title": uuidv4()
        }),
        getToken());
    console.log("TRACK:" + track.body);
    check(track, {
        'track added': (res) => res.json('id') != undefined
    });
}

export async function createVideosNoPurchase() {

    let random_boolean = Math.random() < 0.5;

    const createVideo = http.asyncRequest(
        "POST",
        `${API_URL}/api/dashboard/contents`,
        JSON.stringify({
            "published": true,
            "availableWithoutPurchase": random_boolean,
            "showToDemoUsers": false,
            "title": "DemoNewNEW",
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
            "categories": getCategoriesIds("video"),
            "packages": getPackageIds(),
            "duration": 0,
            "shared": [],
            "externalId": "",
            "contentOwnerId": null,
            "geoIpId": null,
            "locales": {},
            "type": "video"
        }),
        getToken()
    );
    createVideo.then(
        res => {
            check(res, {
                'video is created': (res) => res.json('id') != undefined
            });
            addTracks(res.json('id'), "video");
        }
    );

}