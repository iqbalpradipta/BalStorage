package middlewares

import (
	"net/http"
	"time"

	"balStorage/backend/helpers"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

func RateLimitByIP(requestsPerMinute int, burst int) echo.MiddlewareFunc {
	if requestsPerMinute <= 0 {
		requestsPerMinute = 1
	}
	if burst <= 0 {
		burst = 1
	}

	return middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(middleware.RateLimiterMemoryStoreConfig{
			Rate:      rate.Every(time.Minute / time.Duration(requestsPerMinute)),
			Burst:     burst,
			ExpiresIn: 10 * time.Minute,
		}),
		IdentifierExtractor: func(c echo.Context) (string, error) {
			return c.RealIP(), nil
		},
		DenyHandler: func(c echo.Context, identifier string, err error) error {
			return helpers.JSON(c, http.StatusTooManyRequests, false, "too many requests, please try again later", nil)
		},
	})
}
