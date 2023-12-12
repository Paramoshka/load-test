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
        createChannels: {
            exec: 'updateChannels',
            executor: 'shared-iterations',
            vus: 1,
            iterations: 1,
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

function getchannels() {
    const channels = http.get(`${API_URL}/api/dashboard/contents?limit=500&offset=0&type=channel&sort=desc`,
        getToken());
    return channels.json('rows');

}

function addTracks(contentId: string) {
    const track = http.post(`http://eksdashboard.telebreeze.com/api/dashboard/tracks`,
        JSON.stringify({
            "published": true,
            "type": "channel",
            "contentId": contentId,
            "commercialId": null,
            "props": {},
            "pluginInstanceId": null,
            "uri": uuidv4(),
            "title": uuidv4()
        }),
        getToken());
    console.log("TRACK:" + track.body);
}

export function updateChannels() {
    let channels: JSONArray = getchannels();
    channels.forEach(value => {
        addTracks(value['id']);
       // console.log(value)
    });
   // console.log(channels.length);

}