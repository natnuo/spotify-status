import express, { Request, Response } from 'express';
import { engine } from "express-handlebars";
import SpotifyWebApi from "spotify-web-api-node";
import { readFile, writeFile } from "fs/promises"
import axios from "axios";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

app.engine("hbs", engine({ extname: "hbs", defaultLayout: "main", layoutsDir: path.resolve(__dirname + "/../views/layouts/") }));
app.set("views", path.resolve(__dirname + "/../views"));
app.set("view engine", "hbs");

app.use(express.static(path.resolve(__dirname + "/../public")));

const HOSTNAME = <string>process.env.HOSTNAME;

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
const CALLBACK_REDIRECT_URI = `${HOSTNAME}/callback`;
const AUTH_URI = `${HOSTNAME}/auth`;

const LIGHT_THEME = {
    ab_bkgrd: "black",
    st_c: "#0d0d0d",
    sa_c: "#111111"
}
const DARK_THEME = {
    ab_bkgrd: "white",
    st_c: "#f2f2f2",
    sa_c: "#eeeeee"
}

const redirectToAuth = (redirectUri: string, res: Response) => {
    spotifyApi.setRedirectURI(redirectUri);
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, generateRandomString(16));
    res.redirect(authorizeURL);
}

const renderSong = (req: Request, res: Response, options: any) => {
    res.set("Content-Type", "image/svg+xml");
    // res.render("song.hbs", options);
    processSvg("song", { ...options, ...(<string>(req.query.theme)==="light" ? LIGHT_THEME : DARK_THEME)}).then((result) => { res.sendFile(result) });
}

const processSvg = async (name: string, options: { [key: string]: number | string}) => {
    let index = await readFile(path.resolve(__dirname + `/../views/${name}.svg`), "utf8");
    
    for (let prop in options) {
        if (Object.prototype.hasOwnProperty.call(options, prop)) {
            index = index.replace(new RegExp(`{{ *${prop} *}}`, "g"), options[prop].toString().replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;"));
        }
    }

    let new_path = path.resolve(__dirname + "/../views/processed.svg");
    await writeFile(new_path, index);
    return new_path;
}

const CURRENTLY_PLAYING_DEFAULT_SONG_TITLE  = "Not currently playing...";
const PLAYLIST_DEFAULT_SONG_TITLE           = "Track unavailable...";
const TOP_SONGS_DEFAULT_SONG_TITLE          = "Server error...";
const DEFAULT_SONG_ARTIST                   = "";
const DEFAULT_ALBUM_COVER_URL               = HOSTNAME + "/default_cover.png";

// const CURRENTLY_PLAYING_EXTRA_SCRIPT        = "setTimeout(() => { location.reload(); }, 1000);";
const CURRENTLY_PLAYING_EXTRA_SCRIPT        = "";
const PLAYLIST_EXTRA_SCRIPT                 = "";
const TOP_SONGS_EXTRA_SCRIPT                = "";

let timeout: NodeJS.Timeout | undefined = undefined;
app.get("/callback", (req, res) => {
    if (req.query) {
        spotifyApi.authorizationCodeGrant(<string>req.query.code).then(
            (data) => {
                spotifyApi.setAccessToken(data.body.access_token);
                spotifyApi.setRefreshToken(data.body.refresh_token);

                if (timeout) clearInterval(timeout);
                timeout = setInterval(() => {
                    spotifyApi.refreshAccessToken().then(
                        (data) => {
                            console.log("reloaded access token");
                            spotifyApi.setAccessToken(data.body.access_token);
                        },
                        (err) => {
                            console.log("sdfjsd", err);
                            redirectToAuth(CALLBACK_REDIRECT_URI, res);
                        }
                    )
                }, 30*60*1000);
                res.redirect(HOSTNAME);
            },
            (err) => {
                console.log("aasddd", err);
                redirectToAuth(CALLBACK_REDIRECT_URI, res);
            },
        )
    }
})

app.get("/auth", (req, res) => {
    redirectToAuth(CALLBACK_REDIRECT_URI, res);
})

app.get("/", (req, res) => {
    res.send(`Authentication complete. If you were sent here from my GitHub page, <a href="https://github.com/natnuo">click here</a> to return.`);
})

app.get("/currently-playing", async (req, res) => {
    spotifyApi.getMyCurrentPlayingTrack().then(
        (data) => {
            const item = data.body.item;

            axios.get(item ? (<SpotifyApi.TrackObjectFull>item).album.images[0].url : DEFAULT_ALBUM_COVER_URL, { responseType: "arraybuffer" }).then((response) => {
                const albumCover = "data:image/png;base64," + Buffer.from(response.data, "utf-8").toString("base64");

                renderSong(req, res, {
                    width: DISPLAY_WIDTH,
                    height: DISPLAY_HEIGHT,
                    albumCoverURL: albumCover,
                    songTitle: item ? (<SpotifyApi.TrackObjectFull>item).name : CURRENTLY_PLAYING_DEFAULT_SONG_TITLE,
                    songArtist: item ? (<SpotifyApi.TrackObjectFull>item).artists.map((artist: any) => { return artist.name; }).join(", ") : DEFAULT_SONG_ARTIST,
                    extraScript: CURRENTLY_PLAYING_EXTRA_SCRIPT,
                });
            });
        },
        (err) => {
            console.log("Error when retrieving current track", err);
            res.redirect(AUTH_URI);
        }
    );
});

// ix is not zero-indexed; the lowest valid ix is 1
app.get("/playlist/:playlistID/:ix", async (req, res) => {
    spotifyApi.getPlaylist(req.params.playlistID).then(
        (data) => {
            const ix = parseInt(req.params.ix)-1;
            const item = data.body.tracks.items.length > ix ? data.body.tracks.items[ix] : null;
            const track = item ? item.track : null;

            axios.get(track ? track.album.images[0].url : DEFAULT_ALBUM_COVER_URL, { responseType: "arraybuffer" }).then((response) => {
                const albumCover = "data:image/png;base64," + Buffer.from(response.data, "utf-8").toString("base64");

                renderSong(req, res, {
                    width: DISPLAY_WIDTH,
                    height: DISPLAY_HEIGHT,
                    albumCoverURL: albumCover,
                    songTitle: track ? track.name : PLAYLIST_DEFAULT_SONG_TITLE,
                    songArtist: track ? track.artists.map((artist: any) => { return artist.name; }).join(", ") : DEFAULT_SONG_ARTIST,
                    extraScript: PLAYLIST_EXTRA_SCRIPT,
                });
            });
        },
        (err) => {
            console.log("Error when retrieving current track", err);
            res.redirect(AUTH_URI);
        }
    );
});

// ix is not zero-indexed; the lowest valid ix is 1
app.get("/top-songs/:ix", async (req, res) => {
    spotifyApi.getMyTopTracks().then(
        (data) => {
            const zeroIndexedIx = parseInt(req.params.ix) - 1;
            const item = data.body.items[zeroIndexedIx];

            axios.get(item ? (<SpotifyApi.TrackObjectFull>item).album.images[0].url : DEFAULT_ALBUM_COVER_URL, { responseType: "arraybuffer" }).then((response) => {
                const albumCover = "data:image/png;base64," + Buffer.from(response.data, "utf-8").toString("base64");

                renderSong(req, res, {
                    width: DISPLAY_WIDTH,
                    height: DISPLAY_HEIGHT,
                    albumCoverURL: albumCover,
                    songTitle: item ? (<SpotifyApi.TrackObjectFull>item).name : TOP_SONGS_DEFAULT_SONG_TITLE,
                    songArtist: item ? (<SpotifyApi.TrackObjectFull>item).artists.map((artist: any) => { return artist.name; }).join(", ") : DEFAULT_SONG_ARTIST,
                    extraScript: TOP_SONGS_EXTRA_SCRIPT,
                });
            });
        },
        (err) => {
            console.log("Error when retrieving current track", err);
            res.redirect(AUTH_URI);
        }
    );
});

app.listen(port, () => {
    return console.log(`Listening at ${HOSTNAME}:${port}`);
});