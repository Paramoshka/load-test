import {check, JSONArray, JSONObject} from "k6";
import {Options} from 'k6/options';

/* @ts-ignore */
import http from 'k6/http'
import {Counter} from 'k6/metrics';
import execution from "k6/execution";
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import redis from 'k6/experimental/redis';
import "https://raw.githubusercontent.com/facebook/regenerator/main/packages/runtime/runtime.js"


//vars
const PROJECT_ID = 3672363;

export const CounterErrors = new Counter('Errors');
export const options: Options = {

    thresholds: {
        'Errors': ['count<1'],
    },
    scenarios: {

        getlogin: {
            exec: 'login',
            executor: 'constant-arrival-rate',
            rate: 250,
            timeUnit: '1s', // 1000 iterations per second, i.e. 1000 RPS
            duration: '1000s',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 3000, // if the preAllocatedVUs are not enough, we can initialize more
        },

        watchAuth: {
            exec: 'watchAuth',
            startTime: '1000s',
            executor: 'constant-arrival-rate',
            rate: 250,
            timeUnit: '1s', // 1000 iterations per second, i.e. 1000 RPS
            duration: '900s',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 3000, // if the preAllocatedVUs are not enough, we can initialize more
        },
        watch: {
            exec: 'watchNoAuth',
            startTime: '1000s',
            executor: 'constant-arrival-rate',
            rate: 900,
            timeUnit: '1s', // 1000 iterations per second, i.e. 1000 RPS
            duration: '900s',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 3000, // if the preAllocatedVUs are not enough, we can initialize more
        },

        watch2: {
            exec: 'watch2',
            startTime: '1060s',
            executor: 'constant-arrival-rate',
            rate: 250,
            timeUnit: '1s', // 1000 iterations per second, i.e. 1000 RPS
            duration: '900s',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 3000, // if the preAllocatedVUs are not enough, we can initialize more
        },
        watch3: {
            exec: 'watch3',
            startTime: '1120s',
            executor: 'constant-arrival-rate',
            rate: 250,
            timeUnit: '1s', // 1000 iterations per second, i.e. 1000 RPS
            duration: '900s',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 3000, // if the preAllocatedVUs are not enough, we can initialize more
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
const API_URL: string = 'http://eksweb.telebreeze.com';
const OPERATOR_ID = '1fb1b4c7-dbd9-469e-88a2-c207dc195869';
//let ids: { [x: string]: any; } = {};

//redis

const redis_addrs = __ENV.REDIS_ADDRS || '';
const redis_password = __ENV.REDIS_PASSWORD || '';
const redisClient = new redis.Client({
    addrs: redis_addrs.split(',') || new Array('localhost:6379'), // in the form of 'host:port', separated by commas
    password: redis_password,
});


async function getUserToken(username: string) {
    let token = await redisClient.get(username);

    return token;
}
async function getChannelidAuth(username: string) {
    if (params['channels'] === undefined) {
        const channels = http.get(`${API_URL}/api/player/videos?language=en&os=browser&platform=web&operator_id=${OPERATOR_ID}&device_id=1&density=1&page=1&per_page=10&type=video`,
            {
                headers: {
                    'Content-Type':  'application/json',
                    Authorization: `Bearer ${await getUserToken(username)}`,
                },
            });
        params['channels'] = channels.json('content.data');
       // console.log(channels.body);
    }
    let i = randomIntBetween(0, (params['channels']).length -1);
    //console.log(params['channels'][0]['id']);
    return params['channels'][i]['id'];
}

async function getChannelIdNoAuth() {
    let newArr: (string | number | boolean | JSONArray | JSONObject | null)[] = [];
    if (params['channels'] === undefined) {
        const channels = http.get(`${API_URL}/api/player/videos?language=en&os=browser&platform=web&operator_id=${OPERATOR_ID}&device_id=1&density=1&page=1&per_page=10&type=video`,);
        //params['channels'] = channels.json('content.data');
        //console.log(channels.body);
        let noSort = channels.json('content.data') as JSONArray;
        noSort.forEach(val => {
            if (val['available'] === true) {
                newArr.push(val);
            }
        });
        params['channels'] = newArr;
    }
    let i = randomIntBetween(0, (params['channels']).length -1);
   // console.log(params['channels']);
    return params['channels'][i]['id'];
}

export async function watchAuth()  {
    const username = execution.scenario.iterationInTest + "username";
    let channelID = await getChannelidAuth(username);
    let streamID;
    const stream = await http.asyncRequest("GET",`${API_URL}/api/player/streams?language=ru&operator_id=${OPERATOR_ID}&device_id=5&density=1&client=browser&platform=web&os=linux&media_id=${channelID}`,
        {},
        {
            headers: {
                'Content-Type':  'application/json',
                Authorization: `Bearer ${await getUserToken(username)}`,
            },
        });

            check(stream, {
                'get stream': (res) => res.json('code') === 1
            });
            streamID = stream.json('content')[0]['id'];


   // console.log(stream.body);


   // watch position
    const watchpostion = await http.asyncRequest("POST",
        `${API_URL}/api/player/watch-position`,
        JSON.stringify({
            contentId: await channelID,
            streamId: await streamID,
            duration: 100,
            position: 50,
            device_id: 'asdfasdfasdf',
            os: 'linux',
            platform: 'web',
            language: 'en',
            density: 1

        }),
        {
            headers: {
                'Content-Type':  'application/json',
                Authorization: `Bearer ${await getUserToken(username)}`,
            },
            cookies: stream.cookies
        });
    check(watchpostion, {
        'watch position update' : (res) => res.json('code') === 1
    });

    await redisClient.set('mediaId', channelID);
    await redisClient.set('streamId', streamID);

    //await redisClient.set('player-coockie', stream.cookies);

    //stats
    let begin: number = Date.now();
    const stat = await http.asyncRequest(
        "POST",
        `${API_URL}/api/statistics`,
        JSON.stringify({
                statistics: [
                    {
                        contentId: await channelID,
                        contentType: 'video',
                        streamId: await streamID,
                        data: [{
                            startAt: begin,
                            beginPosition: 0,
                            endPosition: 50000,
                            buffering: 0,
                        }]
                    }
                ],
                device_id: 'asdfasdfasdf',
                os: 'linux',
                platform: 'web',
                language: 'en',
                density: 1,
                operatorId: OPERATOR_ID,
            }
        ),
        {
            headers: {
                'Content-Type':  'application/json',
                Authorization: `Bearer ${await getUserToken(username)}`,
            },
            cookies: watchpostion.cookies
        });

    check(stat, {
        'stats': (res) => res.json('code') === 1
    });

}

export async function watchNoAuth()  {

    let channelID = await getChannelIdNoAuth();
    let streamID;

    const stream = await http.asyncRequest("GET",`${API_URL}/api/player/streams?language=ru&operator_id=${OPERATOR_ID}&device_id=5&density=1&client=browser&platform=web&os=linux&media_id=${channelID}`,);

   // console.log("stream no auth" + stream.body);
    check(stream, {
        'get stream no auth': (res) => res.json('code') === 1
    });

    streamID = stream.json('content')[0]['id'];

    //stats
    let begin: number = Date.now();
    const stat = await http.asyncRequest("POST",`${API_URL}/api/statistics`,
        JSON.stringify({
                statistics: [
                    {
                        contentId: await channelID,
                        contentType: 'video',
                        streamId: await streamID,
                        data: [{
                            startAt: begin,
                            beginPosition: 0,
                            endPosition: 50000,
                            buffering: 0,
                        }]
                    }
                ],
                device_id: 'asdfasdfasdf',
                os: 'linux',
                platform: 'web',
                language: 'en',
                density: 1,
                operatorId: OPERATOR_ID,
            }
        ),
        {
            headers: {
                'Content-Type':  'application/json',
            },
            cookies: stream.cookies,
        });
   // console.log("stat no auth " + stat.body);
    check(stat, {
        'stats no auth': (res) => res.json('code') === 1
    });
}

export async function login() {
    const username = execution.scenario.iterationInTest + "username";
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
    let token = login.json('content.token.access_token');
    await redisClient.set(username, token);
}

export async function watch2() {
    const username = execution.scenario.iterationInTest + "username";

    const mediaId = await redisClient.get('mediaId');
    const streamId = await redisClient.get('streamId');

    // watch position
    const watchpostion = await http.asyncRequest("POST",
        `${API_URL}/api/player/watch-position`,
        JSON.stringify({
            contentId: mediaId,
            streamId: streamId,
            duration: 100,
            position: 50,
            device_id: 'asdfasdfasdf',
            os: 'linux',
            platform: 'web',
            language: 'en',
            density: 1

        }),
        {
            headers: {
                'Content-Type':  'application/json',
                Authorization: `Bearer ${await getUserToken(username)}`,
            },
        });
    check(watchpostion, {
        'watch 2 position update' : (res) => res.json('code') === 1
    });

}

export async function watch3() {
    const username = execution.scenario.iterationInTest + "username";

    const mediaId = await redisClient.get('mediaId');
    const streamId = await redisClient.get('streamId');

    // watch position
    const watchpostion = await http.asyncRequest("POST",
        `${API_URL}/api/player/watch-position`,
        JSON.stringify({
            contentId: mediaId,
            streamId: streamId,
            duration: 100,
            position: 50,
            device_id: 'asdfasdfasdf',
            os: 'linux',
            platform: 'web',
            language: 'en',
            density: 1

        }),
        {
            headers: {
                'Content-Type':  'application/json',
                Authorization: `Bearer ${await getUserToken(username)}`,
            },
        });
    check(watchpostion, {
        'watch 3 position update' : (res) => res.json('code') === 1
    });

}