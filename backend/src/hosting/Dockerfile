FROM node:16.14.0-alpine

WORKDIR /usr/src/app

COPY ./backend/package*.json /backend/
# RUN npm install

COPY ./backend ./backend
COPY ./common ./common

EXPOSE 3001

# Change to backend directory
WORKDIR /usr/src/app/backend
CMD ["npm", "run", "start"]