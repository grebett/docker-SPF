# inherit from alpine-nginx-nodejs
FROM smebberson/alpine-nginx-nodejs

# 1) NGINX

# Push website source to Nginx defaut website repository
COPY ./src/public /usr/html/

# Push Nginx local conf to image
COPY ./conf/nginx.conf /etc/nginx/nginx.conf

# 2) Node.js

# install Node.js application
RUN mkdir -p /app
COPY ./src/app /app
WORKDIR /app
RUN npm install

# run Node.js server
CMD ["npm", "start"]
EXPOSE 3000
