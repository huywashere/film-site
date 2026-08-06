-- CineVerse OpenResty Lua Security & Rate Limiting Module
local ffi = require("ffi")

local _M = {}

function _M.check_security()
    local uri = ngx.var.uri
    local client_ip = ngx.var.remote_addr

    -- 1. Block common SQLi and XSS patterns at the Nginx edge
    local args = ngx.req.get_uri_args()
    for key, val in pairs(args) do
        if type(val) == "string" then
            if string.match(val, "(?i)union%s+select") or string.match(val, "<script>") then
                ngx.log(ngx.WARN, "[OpenResty Security] Blocked malicious request from IP: ", client_ip)
                ngx.status = ngx.HTTP_FORBIDDEN
                ngx.header.content_type = "application/json; charset=utf-8"
                ngx.say('{"success":false,"message":"Yêu cầu bị chặn bởi tường lửa OpenResty"}')
                return ngx.exit(ngx.HTTP_FORBIDDEN)
            end
        end
    end

    -- 2. Security Headers Injection
    ngx.header["X-Frame-Options"] = "SAMEORIGIN"
    ngx.header["X-Content-Type-Options"] = "nosniff"
    ngx.header["X-XSS-Protection"] = "1; mode=block"
    ngx.header["Server"] = "CineVerse-Edge-Gateway"
end

return _M
