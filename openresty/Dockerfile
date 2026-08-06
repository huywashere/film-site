# OpenResty High-Performance Edge Gateway Dockerfile for CineVerse
FROM openresty/openresty:1.25.3.1-alpine

# Install lua-resty-redis & dependencies
RUN apk add --no-libc-pkgs --no-cache curl bash openssl

# Copy OpenResty Nginx configuration & Lua scripts
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY lua/ /usr/local/openresty/nginx/conf/lua/

EXPOSE 80 443

CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
