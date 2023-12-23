import {check, JSONArray, JSONObject, sleep} from "k6";
import {Options} from 'k6/options';

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
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: 1,
            startTime: '10s'
        },

        createVideos: {
            exec: 'createVideos',
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: 1,
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
const API_KEY: string = '8078e036-f181-4dd7-a501-ed37c0ef841a';
const COUNT_CATEGOTY_CHANNELS = 1;
const COUNT_CATEGOTY_VIDEOS = 1;
const CHANNELS_COUNT = 100;
const VIDEOS_COUNT = 100;

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

async function createCategory(type: string, title: string) {
    const data = http.asyncRequest(
        "POST",
        `${API_URL}/api/dashboard/categories`,
        JSON.stringify({
            "published": 'true',
            "mode": 'regular',
            "os": [],
            "title": `${title}`,
            "externalId": '',
            "locales": '{}',
            "type": `${type}`
        }),
        getToken()
    );
    data.then(res => {
        console.log(res.body);
    })
        .catch(err => {
            console.log(err);
        })
}

async function createPackage() {
    const createPackage = http.asyncRequest(
        "POST",
        `${API_URL}/api/dashboard/packages`,
        JSON.stringify({
            "title": `${uuidv4()}`
        }),
        getToken()
    );
    createPackage.then(res => {
        let packageId = res.json('id');
        createPlan(packageId);
    })
        .catch(err => {
            console.log(err)
        })
}

async function createPlan(packageId: number | string | JSONArray | JSONObject | null | boolean) {
    const createPlan = http.asyncRequest(
        "POST",
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
            "packageId": `${packageId}`,
            "title": `${randomString(10, `aeioubcdfghijpqrstuv`)}`,
            "renewSubscriptions": true,
            "published": true,
            "locales": {}
        }),
        getToken()
    );
    createPlan.then(res => {
        let planId = res.json('id');
        createOffer(planId);
    }).catch(err => {
        console.log(err);
    })
}

async function createOffer(planId: number | string | JSONArray | JSONObject | null | boolean) {

    const createOffers = http.asyncRequest(
        "POST",
        `${API_URL}/api/dashboard/offers`,
        JSON.stringify({
            "url": "",
            "discounts": [],
            "price": '1',
            "intervalType": "month",
            "intervalLength": '1',
            "published": 'true',
            "planId": `${planId}`
        }),
        getToken()
    );

    createOffers.then(res => {
        console.log(res);
    })
        .catch(err => {
            console.log(err);
        })
}

export function createContent() {

    for (let i = 0; i < COUNT_CATEGOTY_CHANNELS; i++) {
        createCategory("channel", "ChannelCategory" + i)
    }

    for (let i = 0; i < COUNT_CATEGOTY_VIDEOS; i++) {
        createCategory("video", "VideoCategory" + i)
    }

    createPackage();

}

async function getPackageIds() {
    if (params['packageIds'] === undefined) {
        const getPackages = await http.get(
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

async function getCategoriesIds(type: string) {

    if (params['categoryIds'] === undefined) {
        const getPackages = await http.get(
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

async function createMediaContent(title: string, type: string, categoryId: string, packageIds: any) {
    let random_boolean = Math.random() < 0.5;

    const createChannel =  http.asyncRequest(
        "POST",
        `${API_URL}/api/dashboard/contents`,
        JSON.stringify({
            "published": true,
            "availableWithoutPurchase": random_boolean,
            "showToDemoUsers": random_boolean,
            "title": `${title}`,
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
            "categories": [categoryId],
            "packages": packageIds,
            "duration": 0,
            "shared": [],
            "externalId": "",
            "contentOwnerId": null,
            "geoIpId": null,
            "locales": {},
            "type": `${type}`
        }),
        getToken()
    );

    createChannel.then(
        res => {
            let contentId = res.json('id');
            if (contentId === undefined) {
                console.log(res.body);
            }
            console.log(res.body);
            addTracks(contentId, type);
        }
    ).catch(err => {
        console.log(err);
    });
}

export async function createChannels() {
    //channel
    let data =  getCategoriesIds("channel");
    let packageIds = await getPackageIds();
    sleep(1);

    data.then(res => {
        (res as [x: string]).forEach((id, index) => {
            for (let i = 0; i < CHANNELS_COUNT; i++) {
                createMediaContent("channel"+ index + i, "channel", id, packageIds);
                sleep(1);
            }
            sleep(1);
        })
    });
}

export async function createVideos() {
    //channel
    let data =  getCategoriesIds("video");
    let packageIds = await getPackageIds();
    sleep(1);

    data.then(res => {
        (res as [x: string]).forEach((id, index) => {
            for (let i = 0; i < VIDEOS_COUNT; i++) {
                createMediaContent("video"+ index + i, "video", id, packageIds);
                sleep(1);
            }
            sleep(1);
        })
    });
}

async function addTracks(contentId: number | string | JSONArray | JSONObject | null | boolean, type: string) {
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
