package security

import "net/url"

func queryEscape(value string) string {
	return url.QueryEscape(value)
}
