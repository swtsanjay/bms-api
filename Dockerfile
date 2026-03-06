FROM node:20

WORKDIR /usr/app

# Install dependencies
COPY package*.json ./
RUN npm install
RUN npm install pm2 -g

# Copy the rest of the files (including tsconfig.json and src)
COPY . /usr/app

# Build TypeScript project
RUN npm run build

EXPOSE 4000

# Start the app with PM2
CMD ["pm2-runtime", "start", "./dist/app.js"]
