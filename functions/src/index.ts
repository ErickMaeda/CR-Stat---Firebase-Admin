import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { uniqBy } from 'lodash';
import { CLASH_ROYALE_API_KEY } from '../keys/keys';

admin.initializeApp();

const config = {
    headers: {
        'authorization': "Bearer " + CLASH_ROYALE_API_KEY,
        'Accept': 'application/json'
    }
};

const BASE_API = "https://api.clashroyale.com/v1";

export const updateWarLogs = functions.https.onRequest(async (request, response) => {
    try {
        const clanTag = request.query.tag;
        if (!clanTag) {
            response.status(400).send('TAG param not found!');
            return;
        }
        const clan = await axios.get(`${BASE_API}/clans/%23${clanTag}`, config);
        const clanData = clan.data;
        const warlog = await axios.get(`${BASE_API}/clans/%23${clanTag}/warlog`, config);

        const reference = admin
            .firestore()
            .collection("clans")
            .doc(`#${clanTag}`);

        const clanStored = await reference.get();
        const clanStoredData = clanStored.data();

        if (clanStoredData && clanStoredData.warlog) {
            clanData.warlog = uniqBy([...clanStoredData.warlog, ...warlog.data.items], 'createdDate');
        } else {
            clanData.warlog = warlog.data.items;
        }

        reference.set(clanData, { merge: true });
        response.send(JSON.stringify(clanStoredData));
    } catch (error) {
        response.status(error.code).send(error.message);
    }
});

export const getClan = functions.https.onRequest(async (request, response) => {
    try {
        const clanTag = request.query.tag;
        if (!clanTag) {
            response.status(400).send('TAG param not found!');
            return;
        }

        const reference = admin
            .firestore()
            .collection("clans")
            .doc(`#${clanTag}`);

        const clan = await reference.get();
        response.send(JSON.stringify(clan.data()));
    } catch (error) {
        response.status(error.code).send(error.message);
    }
});