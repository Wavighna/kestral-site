# Kestral site

Static site. No build step. Works on GitHub Pages as is.

## Put it online (GitHub Pages)

1. Create a repo (for example `kestral-site`) and push this folder to it.
2. Repo Settings, Pages, deploy from the `main` branch, root folder.
3. The `CNAME` file already says `kestralcare.com`. In Settings, Pages, enter that domain too and tick "Enforce HTTPS" once it's available.
4. At your registrar's DNS, add:
   - four `A` records on `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - one `CNAME` record on `www` pointing to `<your-github-username>.github.io`

   (Check GitHub's current Pages docs if any of this fails, the IPs are theirs to change.)

## Using your own paintings instead of the generated ones

Right now the animation paints itself in code so you can see the timing. To use your own:

1. Paint each stage as its own image, youngest to oldest, and drop them in `assets/frames/`.
2. List them in `frames.js` in order (an example is in that file).
3. The wordmark keeps painting itself on top and changes color and size each stage.

Rules so the frames never "jump" between sheets:

- Same pixel size for every frame (16:9, for example 2560 x 1440).
- Same horizon line, same tree position, same kid position and ground line in every frame. Only the kid's height, the tree's size and the number of colors change.
- Keep the area behind the wordmark (upper middle third) calm, so the lettering stays readable.
- Pick one set of paint colors up front (a red, a yellow, a blue and the mixes of them) and reuse the exact same ones in every frame.
- Export all frames from the same file or template with the same settings.

## Files

- `index.html`, `style.css`: the page
- `script.js`: the painting animation and painted wordmark
- `frames.js`: your hand-painted frames go here
- `CNAME`: custom domain for GitHub Pages
