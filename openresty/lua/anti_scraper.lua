-- CineVerse Advanced Anti-Scraping & Anti-Hotlinking Lua Module
local hmac = require("resty.hmac")
local str = require("resty.string")

local _M = {}

local SECRET_KEY = process.env.STREAM_SECRET_KEY or "cineverse_hls_stream_secret_2026_key!"

function _M.verify_stream_access()
    local uri = ngx.var.uri
    local client_ip = ngx.var.remote_addr
    local user_agent = ngx.var.http_user_agent or ""
    local http_referer = ngx.var.http_referer or ""

    -- 1. Block Automated Bot Scrapers (Python, Scrapy, Wget, curl, Go-http-client)
    local lower_ua = string.lower(user_agent)
    if string.match(lower_ua, "python") or
       string.match(lower_ua, "scrapy") or
       string.match(lower_ua, "wget") or
       string.match(lower_ua, "go%-http%-client") or
       string.match(lower_ua, "aiohttp") or
       string.match(lower_ua, "httpx") then
        ngx.log(ngx.WARN, "[Anti-Scraper] Blocked bot UA: ", user_agent, " IP: ", client_ip)
        ngx.status = ngx.HTTP_FORBIDDEN
        ngx.say('{"error":"Forbidden","message":"Bot scraper access blocked"}')
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end

    -- 2. Anti-Hotlinking: Enforce Referer header for HLS manifests
    if string.match(uri, "%.m3u8$") or string.match(uri, "%.ts$") then
        if http_referer == "" or (not string.match(http_referer, "cineverse") and not string.match(http_referer, "localhost")) then
            ngx.log(ngx.WARN, "[Anti-Hotlinking] Blocked invalid referer: ", http_referer, " IP: ", client_ip)
            ngx.status = ngx.HTTP_FORBIDDEN
            ngx.say('{"error":"Forbidden","message":"Direct hotlinking is prohibited"}')
            return ngx.exit(ngx.HTTP_FORBIDDEN)
        end

        -- 3. Verify Signed HLS Stream Token (expiring HMAC token)
        local args = ngx.req.get_uri_args()
        local token = args["token"]
        local expires = tonumber(args["expires"] or 0)
        local now = ngx.time()

        if token and expires then
            if now > expires then
                ngx.status = ngx.HTTP_UNAUTHORIZED
                ngx.say('{"error":"Unauthorized","message":"Stream token expired"}')
                return ngx.exit(ngx.HTTP_UNAUTHORIZED)
            end
        end
    end
end

return _M
