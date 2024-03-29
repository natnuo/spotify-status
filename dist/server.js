"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_handlebars_1 = require("express-handlebars");
const spotify_web_api_node_1 = __importDefault(require("spotify-web-api-node"));
const promises_1 = require("fs/promises");
const axios_1 = __importDefault(require("axios"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.engine("hbs", (0, express_handlebars_1.engine)({ extname: "hbs", defaultLayout: "main", layoutsDir: __dirname + "/views/layouts/" }));
app.set("views", __dirname + "/views");
app.set("view engine", "hbs");
app.use(express_1.default.static(__dirname + "/public"));
const HOSTNAME = process.env.HOSTNAME;
const spotifyApi = new spotify_web_api_node_1.default({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: `${HOSTNAME}/currently-playing`,
});
const generateRandomString = (length) => Math.random().toString(20).substring(2, 2 + length);
const scopes = ["user-read-private", "user-read-email", "user-top-read", "user-read-currently-playing"];
const DISPLAY_WIDTH = 420;
const DISPLAY_HEIGHT = 88;
const CURRENTLY_PLAYING_REDIRECT_URI = `${HOSTNAME}/currently-playing`;
const TOP_SONGS_REDIRECT_URI = `${HOSTNAME}/top-songs/`;
const CALLBACK_REDIRECT_URI = `${HOSTNAME}/callback`;
const AUTH_URI = `${HOSTNAME}/auth`;
const redirectToAuth = (redirectUri, res) => {
    spotifyApi.setRedirectURI(redirectUri);
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, generateRandomString(16));
    res.redirect(authorizeURL);
};
const renderSong = (res, options) => {
    res.set("Content-Type", "image/svg+xml");
    // res.render("song.hbs", options);
    processSvg("song", options).then((result) => { res.sendFile(result); });
};
const processSvg = (name, options) => __awaiter(void 0, void 0, void 0, function* () {
    let index = yield (0, promises_1.readFile)(__dirname + `/views/${name}.svg`, "utf8");
    for (let prop in options) {
        if (Object.prototype.hasOwnProperty.call(options, prop)) {
            index = index.replace(new RegExp(`{{ *${prop} *}}`, "g"), options[prop].toString().replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;"));
        }
    }
    let new_path = __dirname + "/views/processed.svg";
    yield (0, promises_1.writeFile)(new_path, index);
    return new_path;
});
const CURRENTLY_PLAYING_DEFAULT_SONG_TITLE = "Not currently playing...";
const TOP_SONGS_DEFAULT_SONG_TITLE = "Server error...";
const DEFAULT_SONG_ARTIST = "";
const DEFAULT_ALBUM_COVER_URL = HOSTNAME + "/default_cover.png";
const CURRENTLY_PLAYING_EXTRA_SCRIPT = "setTimeout(() => { location.reload(); }, 1000);";
// const CURRENTLY_PLAYING_EXTRA_SCRIPT        = "";
const TOP_SONGS_EXTRA_SCRIPT = "";
let timeout = undefined;
app.get("/callback", (req, res) => {
    if (req.query) {
        spotifyApi.authorizationCodeGrant(req.query.code).then((data) => {
            console.log(data.body);
            spotifyApi.setAccessToken(data.body.access_token);
            spotifyApi.setRefreshToken(data.body.refresh_token);
            if (timeout)
                clearInterval(timeout);
            timeout = setInterval(() => {
                spotifyApi.refreshAccessToken().then((data) => {
                    spotifyApi.setAccessToken(data.body.access_token);
                }, (err) => {
                    console.log("sdfjsd", err);
                    redirectToAuth(CALLBACK_REDIRECT_URI, res);
                });
            }, 30 * 60 * 1000);
            res.redirect(HOSTNAME);
        }, (err) => {
            console.log("aasddd", err);
            redirectToAuth(CALLBACK_REDIRECT_URI, res);
        });
    }
});
app.get("/auth", (req, res) => {
    redirectToAuth(CALLBACK_REDIRECT_URI, res);
});
app.get("/currently-playing", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    spotifyApi.getMyCurrentPlayingTrack().then((data) => {
        const item = data.body.item;
        axios_1.default.get(item ? item.album.images[0].url : DEFAULT_ALBUM_COVER_URL, { responseType: "arraybuffer" }).then((response) => {
            const albumCover = "data:image/png;base64," + Buffer.from(response.data, "utf-8").toString("base64");
            renderSong(res, {
                width: DISPLAY_WIDTH,
                height: DISPLAY_HEIGHT,
                albumCoverURL: albumCover,
                songTitle: item ? item.name : CURRENTLY_PLAYING_DEFAULT_SONG_TITLE,
                songArtist: item ? item.artists.map((artist) => { return artist.name; }).join(", ") : DEFAULT_SONG_ARTIST,
                extraScript: CURRENTLY_PLAYING_EXTRA_SCRIPT,
            });
        });
    }, (err) => {
        console.log("Error when retrieving current track", err);
        res.redirect(AUTH_URI);
    });
}));
// ix is not zero-indexed; the lowest valid ix is 1
app.get("/top-songs/:ix", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    spotifyApi.getMyTopTracks().then((data) => {
        const zeroIndexedIx = parseInt(req.params.ix) - 1;
        const item = data.body.items[zeroIndexedIx];
        axios_1.default.get(item ? item.album.images[0].url : DEFAULT_ALBUM_COVER_URL, { responseType: "arraybuffer" }).then((response) => {
            const albumCover = "data:image/png;base64," + Buffer.from(response.data, "utf-8").toString("base64");
            renderSong(res, {
                width: DISPLAY_WIDTH,
                height: DISPLAY_HEIGHT,
                albumCoverURL: albumCover,
                songTitle: item ? item.name : TOP_SONGS_DEFAULT_SONG_TITLE,
                songArtist: item ? item.artists.map((artist) => { return artist.name; }).join(", ") : DEFAULT_SONG_ARTIST,
                extraScript: TOP_SONGS_EXTRA_SCRIPT,
            });
        });
    }, (err) => {
        console.log("Error when retrieving current track", err);
        res.redirect(AUTH_URI);
    });
}));
app.listen(port, () => {
    return console.log(`Listening at ${HOSTNAME}:${port}`);
});
