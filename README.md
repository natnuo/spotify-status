<h1 align="center">Spotify Status Interface</h1>
<p align="center">An interface to display my current Spotify status, using the <a href="https://developer.spotify.com/documentation/web-api">Spotify Web API</a>.</p>

<h2>Functionality</h2>

- <b>Display my (<a href="https://open.spotify.com/user/317hqmqpwo3cwyeh2fiupm43hu7y">NatNu on Spotify</a>) currently playing track.</b>

Format: <code>http://ec2-107-20-43-170.compute-1.amazonaws.com/playlist/currently-playing?theme=[THEME]</code>

Example: <code>http://ec2-107-20-43-170.compute-1.amazonaws.com/currently-playing?theme=light</code>

<a href="https://github.com/natnuo/spotify-data">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="http://ec2-107-20-43-170.compute-1.amazonaws.com/currently-playing?theme=dark"  />
    <source media="(prefers-color-scheme: light)" srcset="http://ec2-107-20-43-170.compute-1.amazonaws.com/currently-playing?theme=light"  />
    <img alt="Not currently playing..." src=""  />
  </picture>
</a>

- <b>Display the tracks of a public playlist.</b>

Format: <code>http://ec2-107-20-43-170.compute-1.amazonaws.com/playlist/[PLAYLIST_ID]/[TRACK_IN_PLAYLIST]?theme=[THEME]</code>

Example: <code>http://ec2-107-20-43-170.compute-1.amazonaws.com/playlist/710ujhc3yot5EfMNWB7sDK/1?theme=dark</code>

<a href="https://github.com/natnuo/spotify-data">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="http://ec2-107-20-43-170.compute-1.amazonaws.com/playlist/710ujhc3yot5EfMNWB7sDK/1?theme=dark"  />
    <source media="(prefers-color-scheme: light)" srcset="http://ec2-107-20-43-170.compute-1.amazonaws.com/playlist/710ujhc3yot5EfMNWB7sDK/1?theme=light"  />
    <img alt="Server error..." src=""  />
  </picture>
</a>

Valid themes are "light" and "dark".

Inspired in part by <a href="https://github.com/natemoo-re/natemoo-re">@natemoo-re</a>'s display
