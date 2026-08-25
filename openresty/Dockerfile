# OpenResty edge gateway for NetPhim.
FROM openresty/openresty:1.25.3.1-alpine

RUN apk add --no-cache curl bash openssl

COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY openresty/lua/ /usr/local/openresty/nginx/conf/lua/
COPY openresty/docker-entrypoint.sh /usr/local/bin/netphim-openresty-entrypoint

RUN chmod 0755 /usr/local/bin/netphim-openresty-entrypoint \
    && mkdir -p /etc/openresty/ssl /var/cache/nginx

EXPOSE 80 443

ENTRYPOINT ["/usr/local/bin/netphim-openresty-entrypoint"]
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
