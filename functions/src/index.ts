import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { uniqBy } from 'lodash';
import { CLASH_ROYALE_API_KEY } from '../keys/keys';

admin.initializeApp();

const config = {
    headers: {
        'Authorization': "Bearer " + CLASH_ROYALE_API_KEY,
        'Accept': 'application/json'
    }
};

const BASE_API = "https://api.royaleapi.com";

export const updateWarLogs = functions.https.onRequest(async (request, response) => {
    try {
        const clanTag = request.query.tag;
        if (!clanTag) {
            response.status(400).send('TAG param not found!');
            return;
        }
        const clan = await axios.get(`${BASE_API}/clan/${clanTag}`, config);
        const clanData = clan.data;
        const warlog = await axios.get(`${BASE_API}/clan/${clanTag}/warlog`, config);

        const reference = admin
            .firestore()
            .collection("clans")
            .doc(`#${clanTag}`);

        const clanStored = await reference.get();
        const clanStoredData = clanStored.data();

        if (clanStoredData && clanStoredData.warlog) {
            clanData.warlog = uniqBy([...clanStoredData.warlog, ...warlog.data], 'createdDate');
        } else {
            clanData.warlog = warlog.data;
        }

        clanData.lastUpdate = new Date();

        await reference.set(clanData, { merge: true });
        response.status(200).send(JSON.stringify(clanData));
    } catch (error) {
        response.status(500).send(error);
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
        response.status(200).send(JSON.stringify(clan.data()));
    } catch (error) {
        response.status(500).send(error);
    }
});