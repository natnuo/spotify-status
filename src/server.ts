import express, { Response } from 'express';
import { engine } from "express-handlebars";
import SpotifyWebApi from "spotify-web-api-node";
import { readFile, writeFile } from "fs/promises"

const app = express();
const port = process.env.PORT || 3000;

app.engine("hbs", engine({ extname: "hbs", defaultLayout: "main", layoutsDir: __dirname + "/views/layouts/" }));
app.set("views", __dirname + "/views");
app.set("view engine", "hbs");

app.use(express.static(__dirname + "/public"));

const HOSTNAME = process.env.HOSTNAME;

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: `${HOSTNAME}/currently-playing`,
});

const generateRandomString = (length: number)=>Math.random().toString(20).substring(2, 2+length)
const scopes = ["user-read-private", "user-read-email", "user-top-read", "user-read-currently-playing"];

const DISPLAY_WIDTH = 420;
const DISPLAY_HEIGHT = 88;

const CURRENTLY_PLAYING_REDIRECT_URI = `${HOSTNAME}/currently-playing`;
const TOP_SONGS_REDIRECT_URI = `${HOSTNAME}/top-songs/`;
const redirectToAuth = (redirectUri: string, res: Response) => {
    spotifyApi.setRedirectURI(redirectUri);
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, generateRandomString(16));
    res.redirect(authorizeURL);
}

const renderSong = (res: Response, options: any) => {
    res.set("Content-Type", "image/svg+xml");
    // res.render("song.hbs", options);
    processSvg("song", options).then((result) => { res.sendFile(result) });
}

const processSvg = async (name: string, options: { [key: string]: string}) => {
    let index = await readFile(__dirname + `/views/${name}.svg`, "utf8");
    
    for (let prop in options) {
        if (Object.prototype.hasOwnProperty.call(options, prop)) {
            index = index.replace(new RegExp(`{{ *${prop} *}}`, "g"), options[prop]);
        }
    }

    let new_path = __dirname + "/views/processed.svg";
    await writeFile(new_path, index);
    return new_path;
}

const CURRENTLY_PLAYING_DEFAULT_SONG_TITLE  = "Not currently playing...";
const TOP_SONGS_DEFAULT_SONG_TITLE          = "Server error...";
const DEFAULT_SONG_ARTIST                   = "";
const DEFAULT_ALBUM_COVER_URL               = HOSTNAME + "/default_cover.png";

// const CURRENTLY_PLAYING_EXTRA_SCRIPT        = "setTimeout(() => { location.reload(); }, 1000);";
const CURRENTLY_PLAYING_EXTRA_SCRIPT        = "";
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
                        renderSong(res, {
                            width: DISPLAY_WIDTH,
                            height: DISPLAY_HEIGHT,
                            albumCoverURL: item ? (<SpotifyApi.TrackObjectFull>item).album.images[0].url : DEFAULT_ALBUM_COVER_URL,
                            songTitle: item ? (<SpotifyApi.TrackObjectFull>item).name : CURRENTLY_PLAYING_DEFAULT_SONG_TITLE,
                            songArtist: item ? (<SpotifyApi.TrackObjectFull>item).artists.map((artist: any) => { return artist.name; }).join(", ") : DEFAULT_SONG_ARTIST,
                            extraScript: CURRENTLY_PLAYING_EXTRA_SCRIPT,
                        });
                    },
                    (err) => {
                        console.log("Error when retrieving current track", err);
                        renderSong(res, {
                            width: DISPLAY_WIDTH,
                            height: DISPLAY_HEIGHT,
                            albumCoverURL: DEFAULT_ALBUM_COVER_URL,
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
                        renderSong(res, {
                            width: DISPLAY_WIDTH,
                            height: DISPLAY_HEIGHT,
                            albumCoverURL: item ? (<SpotifyApi.TrackObjectFull>item).album.images[0].url : DEFAULT_ALBUM_COVER_URL,
                            songTitle: item ? (<SpotifyApi.TrackObjectFull>item).name : TOP_SONGS_DEFAULT_SONG_TITLE,
                            songArtist: item ? (<SpotifyApi.TrackObjectFull>item).artists.map((artist: any) => { return artist.name; }).join(", ") : DEFAULT_SONG_ARTIST,
                            extraScript: TOP_SONGS_EXTRA_SCRIPT,
                        });
                    },
                    (err) => {
                        console.log("Error when retrieving current track", err);
                        renderSong(res, {
                            width: DISPLAY_WIDTH,
                            height: DISPLAY_HEIGHT,
                            albumCoverURL: DEFAULT_ALBUM_COVER_URL,
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