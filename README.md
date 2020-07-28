## Quick Start

To create an app, run the following command and follow the instructions you're given:

```sh
npx ironmaker
cd my-app
npm install
```

If you've previously installed `ironmaker` globally via `npm install -g ironmaker`, we recommend you uninstall the package using `npm uninstall -g ironmaker` or `yarn global remove ironmaker` to ensure that npx always uses the latest version.

_([npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) comes with npm 5.2+ and higher, see [instructions for older npm versions](https://gist.github.com/gaearon/4064d3c23a77c74a3614c498a8bb1c5f))_


To run the app in development mode:

```bash
$ npm run dev
```

To start the app in production:

```bash
$ npm start
```

## License

Ironmaker is heavily inspired by and takes some of the functionality from [Express Generator](https://github.com/expressjs/generator), itself licensed under the MIT License.

[MIT](LICENSE)
