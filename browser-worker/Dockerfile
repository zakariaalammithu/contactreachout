# Browser worker image. VERSION COUPLING (do not break it): the Playwright
# package version in package.json MUST exactly match this base image version.
# A caret range (e.g. ^1.62.1) let a rebuild silently install Playwright 1.64.1
# into the v1.62.1 image, whose bundled browser revision differs — every
# chromium.launch() then failed with "Executable doesn't exist", which broke
# all worker form detection and submission. Keep both pinned to the same
# exact version, and bump them together.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs ./
COPY allowlist.mjs ./
ENV PORT=8080
CMD ["npm", "start"]
