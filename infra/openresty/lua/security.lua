local _M = {}

local patterns = {
    [[(?:union\s+(?:all\s+)?select|information_schema|sleep\s*\(|benchmark\s*\()]],
    [[(?:<\s*script\b|javascript\s*:|onerror\s*=|onload\s*=)]],
    [[(?:\.\./){3,}]],
}

local function reject(reason)
    ngx.log(ngx.WARN, "[netphim-waf] blocked ", reason, " ip=", ngx.var.remote_addr)
    ngx.status = ngx.HTTP_FORBIDDEN
    ngx.header.content_type = "application/json; charset=utf-8"
    ngx.say('{"success":false,"message":"Yêu cầu không hợp lệ"}')
    return ngx.exit(ngx.HTTP_FORBIDDEN)
end

local function inspect(value)
    if type(value) ~= "string" then
        return false
    end
    if #value > 8192 or value:find("\0", 1, true) then
        return true
    end
    for _, pattern in ipairs(patterns) do
        if ngx.re.find(value, pattern, "ijo") then
            return true
        end
    end
    return false
end

function _M.check()
    if #(ngx.var.request_uri or "") > 12288 then
        return reject("request-uri")
    end

    local args, err = ngx.req.get_uri_args(100)
    if err == "truncated" then
        return reject("too-many-query-args")
    end
    for key, value in pairs(args) do
        if inspect(key) then
            return reject("query-key")
        end
        if type(value) == "table" then
            for _, item in ipairs(value) do
                if inspect(item) then
                    return reject("query-value")
                end
            end
        elseif inspect(value) then
            return reject("query-value")
        end
    end
end

return _M
