import express, { Response } from 'express';
import { engine } from "express-handlebars";
import SpotifyWebApi from "spotify-web-api-node";
import { readFile } from "fs/promises"

const app = express();
const port = 3000;

app.engine("hbs", engine({ extname: "hbs", defaultLayout: "main", layoutsDir: __dirname + "/views/layouts/" }));
app.set("views", __dirname + "/views");
app.set("view engine", "hbs");

app.use(express.static(__dirname + "/public"));

const HOSTNAME = "https://natnuo-spotify-data-bcf8ecc1a8d6.herokuapp.com";

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: `${HOSTNAME}/currently-playing`,
    // redirectUri: "natnuo.github.io/spotify-data/callback",
});

// Create the authorization URL
// var authorizeURL = spotifyApi.createAuthorizeURL(scope, state);

// https://accounts.spotify.com:443/authorize?client_id=5fe01282e44241328a84e7c5cc169165&response_type=code&redirect_uri=https://example.com/callback&scope=user-read-private%20user-read-email&state=some-state-of-my-choice
// console.log(authorizeURL);

// app.get("/login", (req, res) => {
//     var state = "sdifujildusiodfu";
//     var scope = 'user-read-private user-read-email';

//     res.redirect('https://accounts.spotify.com/authorize?' +
//         querystring.stringify({
//             response_type: 'code',
//             client_id: "489bf59cba0a48f7a06ee386920ce727",
//             scope: scope,
//             redirect_uri: "http://localhost:3000/callback",
//             state: state
//         }
//     ));
// });

// const code = "AQB06BPv-zYoIk8VQV_RVvEm1ZJnUplzsUGpB35AE342n-O7rRYRMrWdePY4Psf_3aqLyFDvxxOBKuRguIdf0Px1VuauMKYulG9OrOZUx919BbwqW_6PH6FzsweV0zHp0j9va7Jjd-eRtNIOPCMWDxwsVS2eZYbgig4rsp2z2aCpiDUIZcOcHVbjlumtv9zHTcUy-4eWYcJkCyo73PaPJiK7fCyM3A";

// spotifyApi.authorizationCodeGrant(code).then(
//     (data) => {
//         console.log(data.body);

//         spotifyApi.setAccessToken(data.body.access_token);
//         spotifyApi.setAccessToken(data.body.refresh_token);
//     },
//     (err) => {
//         console.log("Error when retrieving access token", err);
//     },
// )

// setInterval(() => {

//     spotifyApi.refreshAccessToken().then(
//         (data) => {
//             spotifyApi.setAccessToken(data.body["access_token"]);
//         },
//         (err) => {
//             console.log("Error when refreshing access token", err);
//         },
//     )
// }, 3600*1000-10000)

const generateRandomString = (length=6)=>Math.random().toString(20).substring(2, 2+length)
const scopes = ["user-read-private", "user-read-email", "user-top-read", "user-read-currently-playing"];

const DISPLAY_WIDTH = 420;
const DISPLAY_HEIGHT = 88;

// const processSvg = async (name: string, options: { [key: string]: string}) => {
//     let index = await readFile(__dirname + `/views/${name}.svg`, "utf8");
    
//     for (let prop in options) {
//         if (Object.prototype.hasOwnProperty.call(options, prop)) {
//             index = index.replace(new RegExp(`{{ *${prop} *}}`, "g"), options[prop]);
//         }
//     }

//     return index;
// }

const CURRENTLY_PLAYING_REDIRECT_URI = `${HOSTNAME}/currently-playing`;
const TOP_SONGS_REDIRECT_URI = `${HOSTNAME}/top-songs/`;
const redirectToAuth = (redirectUri: string, res: Response) => {
    spotifyApi.setRedirectURI(redirectUri);
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, generateRandomString(16));
    res.redirect(authorizeURL);
}

const CURRENTLY_PLAYING_DEFAULT_SONG_TITLE  = "Not currently playing...";
const TOP_SONGS_DEFAULT_SONG_TITLE          = "Server error...";
const DEFAULT_SONG_ARTIST                   = "";

const CURRENTLY_PLAYING_EXTRA_SCRIPT        = "setTimeout(() => { location.reload(); }, 1000);";
const TOP_SONGS_EXTRA_SCRIPT                = "";

app.get("/callback", (req, res) => {
    console.log(req.query);
    res.send("");
})

app.get("/currently-playing", async (req, res) => {
    if (req.query.code) {
        spotifyApi.setRedirectURI(CURRENTLY_PLAYING_REDIRECT_URI);
        spotifyApi.authorizationCodeGrant(<string>req.query.code).then(
            (data) => {
                console.log(data.body);
        
                spotifyApi.setAccessToken(data.body.access_token);
                spotifyApi.setRefreshToken(data.body.refresh_token);

                spotifyApi.getMyCurrentPlayingTrack().then(
                    (data) => {
                        const item = data.body.item;

                        console.log(data);
                        res.render("song.hbs", {
                            width: DISPLAY_WIDTH,
                            height: DISPLAY_HEIGHT,
                            albumCoverURL: item ? (<SpotifyApi.TrackObjectFull>item).album.images[0].url : req.hostname + "/default_cover.png",
                            songTitle: item ? (<SpotifyApi.TrackObjectFull>item).name : TOP_SONGS_DEFAULT_SONG_TITLE,
                            songArtist: item ? (<SpotifyApi.TrackObjectFull>item).artists.map((artist: any) => { return artist.name; }).join(", ") : DEFAULT_SONG_ARTIST,
                            extraScript: TOP_SONGS_EXTRA_SCRIPT,
                        });
                    },
                    (err) => {
                        console.log("Error when retrieving current track", err);
                        res.render("song.hbs", {
                            width: DISPLAY_WIDTH,
                            height: DISPLAY_HEIGHT,
                            songCoverURL: req.baseUrl + "/default_cover.png",
                            songTitle: CURRENTLY_PLAYING_DEFAULT_SONG_TITLE,
                            songArtist: DEFAULT_SONG_ARTIST,
                            extraScript: CURRENTLY_PLAYING_EXTRA_SCRIPT,
                        });
                    }
                );
            },
            (err) => {
                redirectToAuth(CURRENTLY_PLAYING_REDIRECT_URI, res);
            },
        )
    } else {
        redirectToAuth(CURRENTLY_PLAYING_REDIRECT_URI, res);
    }
});

// ix is not zero-indexed; the lowest valid ix is 1
app.get("/top-songs/:ix", async (req, res) => {
    if (req.query.code) {
        spotifyApi.setRedirectURI(TOP_SONGS_REDIRECT_URI + req.params.ix);
        spotifyApi.authorizationCodeGrant(<string>req.query.code).then(
            (data) => {
                console.log(data.body);
        
                spotifyApi.setAccessToken(data.body.access_token);
                spotifyApi.setRefreshToken(data.body.refresh_token);

                const zeroIndexedIx = parseInt(req.params.ix) - 1;

                spotifyApi.getMyTopTracks().then(
                    (data) => {
                        const item = data.body.items[zeroIndexedIx];

                        console.log(data);
                        res.render("song.hbs", {
                            width: DISPLAY_WIDTH,
                            height: DISPLAY_HEIGHT,
                            albumCoverURL: item ? (<SpotifyApi.TrackObjectFull>item).album.images[0].url : req.hostname + "/default_cover.png",
                            songTitle: item ? (<SpotifyApi.TrackObjectFull>item).name : TOP_SONGS_DEFAULT_SONG_TITLE,
                            songArtist: item ? (<SpotifyApi.TrackObjectFull>item).artists.map((artist: any) => { return artist.name; }).join(", ") : DEFAULT_SONG_ARTIST,
                            extraScript: TOP_SONGS_EXTRA_SCRIPT,
                        });
                    },
                    (err) => {
                        console.log("Error when retrieving current track", err);
                        res.render("song.hbs", {
                            width: DISPLAY_WIDTH,
                            height: DISPLAY_HEIGHT,
                            songCoverURL: req.hostname + "/default_cover.png",
                            songTitle: TOP_SONGS_DEFAULT_SONG_TITLE,
                            songArtist: DEFAULT_SONG_ARTIST,
                            extraScript: TOP_SONGS_EXTRA_SCRIPT,
                        });
                    }
                );
            },
            (err) => {
                redirectToAuth(TOP_SONGS_REDIRECT_URI + req.params.ix, res);
            },
        )
    } else {
        redirectToAuth(TOP_SONGS_REDIRECT_URI + req.params.ix, res);
    }
});

app.listen(port, () => {
    return console.log(`Listening at ${HOSTNAME}:${port}`);
});