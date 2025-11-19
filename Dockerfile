FROM node:18-alpine as build

WORKDIR /usr/app

# Install dependencies
COPY package.json /usr/app
RUN npm install
RUN npm install pm2 -g

# Copy the rest of the files (including tsconfig.json and src)
COPY . /usr/app

# Build TypeScript project
RUN npm run build

EXPOSE 5600

# Start the app with PM2
CMD ["pm2-runtime", "start", "./dist/src/app.js"]
