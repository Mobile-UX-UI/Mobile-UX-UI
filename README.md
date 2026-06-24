# Mobile-UX-UI Chat Application – DavaiChat

## Overview
DavaiChat is a mobile-first chat application designed with a strong focus on user experience (UX) and user interface (UI).  
The project includes an interactive prototype created in Figma as well as a frontend implementation using Angular.

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

### 3. Install Angular CLI globally
```bash
npm install -g @angular/cli
```

### 4. Navigate to project folder
```bash
cd angular-mobile-app
```

### 5. Install dependencies
```bash
npm install
```

### 6. Run the application
```bash
ng serve
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

This project can be deployed to GitHub Pages using `angular-cli-ghpages`, which is already included in the project dependencies.

### 1. Build with correct base href

For this repository, the GitHub Pages base path is:

```bash
/Mobile-UX-UI/
```

Build the app with:

```bash
cd angular-mobile-app
npx ng build --configuration production --base-href=/Mobile-UX-UI/
```

### 2. Deploy to GitHub Pages

```bash
npx angular-cli-ghpages --dir=dist/angular-mobile-app/browser --repo=https://github.com/mobile-ux-ui/Mobile-UX-UI.git --branch=gh-pages
```

This publishes the build output to the `gh-pages` branch of the `mobile-ux-ui/Mobile-UX-UI` organization repository. You need write access to that repository.

### 3. GitHub Pages settings

In GitHub, open the repository settings:

```text
Settings -> Pages
```

Use:

```text
Source: Deploy from a branch
Branch: gh-pages
Folder: / (root)
```

The deployed app is available at:

```text
https://mobile-ux-ui.github.io/Mobile-UX-UI/
```

If the browser still shows an older version after deployment, add a cache parameter:

```text
https://mobile-ux-ui.github.io/Mobile-UX-UI/?v=2
```

Increase the number after each deployment, for example `?v=3`, `?v=4`, etc.

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
npx angular-cli-ghpages --dir=dist/angular-mobile-app/browser --repo=https://github.com/mobile-ux-ui/Mobile-UX-UI.git --branch=gh-pages
```

The `main` branch contains the source code.  
The `gh-pages` branch contains the built app used by GitHub Pages.

## Useful Commands

Run locally:

```bash
cd angular-mobile-app
ng serve
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
npx angular-cli-ghpages --dir=dist/angular-mobile-app/browser --repo=https://github.com/mobile-ux-ui/Mobile-UX-UI.git --branch=gh-pages
```
