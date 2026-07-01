# Mobile-UX-UI Chat Application – DavaiChat

## Overview
DavaiChat is a mobile-first chat application designed with a strong focus on user experience (UX) and user interface (UI).  
The project includes an interactive prototype created in Figma as well as a frontend implementation using Angular.

## Latest Version

The latest deployed version is available at:

https://diana08072.github.io/Mobile-UX-UI/?v=17

## Prototype (Figma)
You can explore the UI/UX prototype here:  
https://www.figma.com/design/3BZLHzES0eBRvEAKZJOD2f

## Technologies
- Angular (Frontend Framework)
- Node.js (required for development environment)
- npm (Package Manager)
- GitHub Pages (Deployment)

## Setup & Installation

### 1. Install Node.js
Download and install Node.js from the official website:  
https://nodejs.org/

### 2. Verify installation
```bash
node -v
npm -v
```

### 3. Navigate to the Angular project
```bash
cd angular-mobile-app
```

### 4. Install dependencies
```bash
npm install
```

### 5. Run the application
```bash
npm start
```

The application will be available at:
http://localhost:4200/

You can change the default port by running:

```bash
ng serve --port <your-port>
```

## Project Structure

The Angular application is located in:

```bash
angular-mobile-app/
```

Important files:
- `src/environments/environment.ts` contains the API URL and Google Maps API key.
- `src/app/` contains pages, components, services, models, and utility functions.
- `src/styles.css` contains global styles and dark mode overrides.

## Environment Configuration

Before running or deploying the app, check:

```bash
angular-mobile-app/src/environments/environment.ts
```

Example:

```ts
export const environment = {
  production: false,
  apiUrl: 'https://www2.hs-esslingen.de/~nitzsche/api/',
  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
};
```

If no Google Maps key is configured, map previews may not be shown correctly.  
For public deployment, restrict the Google Maps API key to the deployed domain.

## Build

To create a production build locally:

```bash
cd angular-mobile-app
npm run build
```

The build output is created in:

```bash
angular-mobile-app/dist/angular-mobile-app/browser
```

## GitHub Pages Deployment

This project uses `angular-cli-ghpages`, which is included in the development dependencies.

### Deploy this repository

Run the following commands from the repository root:

```bash
cd angular-mobile-app
npm install
npx ng build --configuration production --base-href=/Mobile-UX-UI/
npx angular-cli-ghpages --dir=dist/angular-mobile-app/browser
```

The deployment tool publishes the build output to the `gh-pages` branch of the Git repository configured as `origin`.

### Deploy your own fork

1. Fork this repository on GitHub.
2. Clone your fork instead of the original repository.
3. Check that `origin` points to your fork:

```bash
git remote -v
```

4. If your repository has a different name, use that name in the base href:

```bash
npx ng build --configuration production --base-href=/<repository-name>/
npx angular-cli-ghpages --dir=dist/angular-mobile-app/browser
```

For example, a repository named `my-chat-app` requires:

```bash
npx ng build --configuration production --base-href=/my-chat-app/
```

The resulting URL follows this format:

```text
https://<github-username>.github.io/<repository-name>/
```

### GitHub Pages settings

In GitHub, open:

```text
Settings -> Pages
```

Configure:

```text
Source: Deploy from a branch
Branch: gh-pages
Folder: / (root)
```

The deployed version of this repository is available at:

https://diana08072.github.io/Mobile-UX-UI/

If an older cached version appears, add or increase a cache parameter:

```text
https://diana08072.github.io/Mobile-UX-UI/?v=17
```

## Updating the Deployed Version

After changing the source code:

```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

Then deploy the updated app:

```bash
cd angular-mobile-app
npx ng build --configuration production --base-href=/Mobile-UX-UI/
npx angular-cli-ghpages --dir=dist/angular-mobile-app/browser
```

The `main` branch contains the source code.  
The `gh-pages` branch contains the built app used by GitHub Pages.

## Useful Commands

Run locally:

```bash
cd angular-mobile-app
npm start
```

Build:

```bash
cd angular-mobile-app
npm run build
```

Build for GitHub Pages:

```bash
cd angular-mobile-app
npx ng build --configuration production --base-href=/Mobile-UX-UI/
```

Deploy:

```bash
cd angular-mobile-app
npx angular-cli-ghpages --dir=dist/angular-mobile-app/browser
```
