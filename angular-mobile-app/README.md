# AngularMobileApp - DavaiChat

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

If another process already uses port `4200`, run:

```bash
ng serve --port 4300
```

## Setup after cloning

From the repository root, navigate into the Angular app:

```bash
cd angular-mobile-app
```

Install dependencies:

```bash
npm install
```

Then start the app:

```bash
ng serve
```

## Environment configuration

Before running or deploying the app, check:

```bash
src/environments/environment.ts
```

Example:

```ts
export const environment = {
  production: false,
  apiUrl: 'https://www2.hs-esslingen.de/~nitzsche/api/',
  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
};
```

If no Google Maps key is configured, map previews may not work correctly.  
For public deployment, restrict the Google Maps API key to the deployed GitHub Pages domain.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

The relevant browser build output is:

```bash
dist/angular-mobile-app/browser
```

## GitHub Pages deployment

This project uses `angular-cli-ghpages` for deployment. It is already included in the project dependencies.

Build with the correct GitHub Pages base path:

```bash
npx ng build --base-href=/Mobile-UX-UI/
```

Deploy the build output:

```bash
npx angular-cli-ghpages --dir=dist/angular-mobile-app/browser
```

This publishes the app to the `gh-pages` branch.

In GitHub, configure Pages like this:

```text
Settings -> Pages
Source: Deploy from a branch
Branch: gh-pages
Folder: / (root)
```

The deployed app is available at:

```text
https://mobile-ux-ui.github.io/Mobile-UX-UI/
```

If the browser still shows an older version after deployment, use a cache parameter:

```text
https://mobile-ux-ui.github.io/Mobile-UX-UI/?v=2
```

Increase the number after each deployment, for example `?v=3`, `?v=4`, etc.

## Updating the deployed version

After changing source code, commit and push to `main`:

```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

Then deploy again:

```bash
npx ng build --base-href=/Mobile-UX-UI/
npx angular-cli-ghpages --dir=dist/angular-mobile-app/browser
```

The `main` branch contains the source code.  
The `gh-pages` branch contains the built app used by GitHub Pages.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page or for information on the detailed versions of the used tools, look up in file: package-lock.json
