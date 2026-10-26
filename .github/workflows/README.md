# GitHub Actions

Both workflows run on Node 22 with Yarn (`yarn install --frozen-lockfile`) and install Playwright's Chromium for the cascade test.

- [`ci.yml`](./ci.yml): on every push to `main` and every pull request, checks that palettes match their anchors, builds both packages, runs `check-brand` on every brand and on `examples/white-label.css`, verifies the build output, and runs the browser cascade test.
- [`publish.yml`](./publish.yml): on a tag named `lagom-tokens@<version>` or `lagom-brands@<version>`, runs the same checks (`yarn ci`), confirms the tag's version matches that package's `package.json`, then publishes that one package to GitHub Packages with the workflow's own `GITHUB_TOKEN`. To publish a tag again, delete it and push it again.

## References

[Quickstart for GitHub Actions](https://docs.github.com/en/actions/quickstart)

[Building and testing Node.js](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)

[Publishing Node.js packages](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
