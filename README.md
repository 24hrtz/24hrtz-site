# 24HRT.Z portfolio site

## Add a new shoot
1. Export your picks from Lightroom as JPGs (about 2500px on the long edge).
2. Put them in a folder named like `red-room` (lowercase, dashes, no spaces). Name the Cover Flow image `cover.jpg`.
3. On GitHub, open the `photos` folder, click **Add file > Upload files**, drag the folder in, and click **Commit changes**.
4. Open `projects.yml`, click the pencil icon, copy an entry, paste it at the top, change the words, and click **Commit changes**.
5. Wait a minute or two. Netlify rebuilds the site on its own.

Photo order inside a project follows the file names: `cover.jpg` first, then alphabetical.
Oversized photos are shrunk automatically when the site builds, but keep each file under 25 MB so GitHub accepts it.

## Change words or prices
Open `index.html`, click the pencil icon, use Cmd+F to find the text, change it, and click **Commit changes**.

## Files
- `photos/` your shoots, one folder per project
- `projects.yml` project names, order, categories
- `index.html` the page itself
- `assets/` the Polaroid and other images
- `build.mjs`, `package.json`, `netlify.toml` how Netlify builds the site (leave these alone)
