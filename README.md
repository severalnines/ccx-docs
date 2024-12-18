# Introduction

This repository facilitates both the Administrator guide, and the User guide.
The documentation can be rendered with either Docusaurus or mkdocs.

An instantion of the docs is available here [https://severalnines.github.io/ccx-docs/](https://severalnines.github.io/ccx-docs/).

## Setup

### Docusaurus

1. Install node (e.g `brew install node`)
2. `npm install`
3. `yarn add @cmfcmf/docusaurus-search-local`
3. `npm run build`
4. `npm start` 

### MkDocs

1. Install mkdocs (`pip install mkdocs mkdocs-material mkdocs-glightbox mkdocs-autorefs`)
2. `mkdocs build`
3. `mkdocs serve`

### Updating sidebar in mkdocs

- Please update the `sidebars.ts`
- You can now convert the `sidebar.ts` to MkDocs compatible nav structure:

```
node convert_sidebars.js
python3 convert_sidebars.py > mkdocs-nav.yml
python3 convert_admonitons.py
```

## Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

### Installation

```
$ yarn
```

### Local Development

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

Using SSH:

```
$ USE_SSH=true yarn deploy
```

Not using SSH:

```
$ GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.


## Contributing

Please read the [Contributing guide](CONTRIBUTING.md).
