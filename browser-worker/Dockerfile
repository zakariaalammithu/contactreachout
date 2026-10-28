FROM mcr.microsoft.com/playwright:v1.62.1-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs ./
COPY allowlist.mjs ./
ENV PORT=8080
CMD ["npm", "start"]
