# Github Actions

Both workflows run on Node 22 with Yarn (`yarn install --frozen-lockfile`).

- [`ci.yml`](./ci.yml) — on every push to `main` and every pull request: `yarn build`, then `yarn verify`.
- [`style-dictionary.yml`](./style-dictionary.yml) — on any pushed `v*` tag: build, verify, then `npm publish` to GitHub Packages (`https://npm.pkg.github.com`). Authenticates with the `TOKEN` repository secret. The published version comes from `package.json`, so bump it before tagging.

## References

[Quickstart for Github Actions](https://docs.github.com/en/actions/quickstart)

[Building and testing Node.js](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)

[Publishing Node.js packages](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)

[Github Action for Yarn](https://github.com/marketplace/actions/github-action-for-yarn)
