package middlewares

import (
	"fmt"
	"net/http"
	"strings"

	"balStorage/backend/helpers"
	"balStorage/backend/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

func AdminOnly(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		role, _ := c.Get("role").(string)
		if role != "admin" {
			return helpers.JSON(c, http.StatusForbidden, false, "admin access required", nil)
		}
		return next(c)
	}
}

func JWTAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return helpers.JSON(c, http.StatusUnauthorized, false, "missing authorization header", nil)
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			return helpers.JSON(c, http.StatusUnauthorized, false, "invalid authorization format", nil)
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			secret := utils.GetEnv("JWT_SECRET", "default_secret")
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			return helpers.JSON(c, http.StatusUnauthorized, false, "invalid or expired token", nil)
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return helpers.JSON(c, http.StatusUnauthorized, false, "invalid token claims", nil)
		}

		c.Set("user_id", claims["sub"])
		c.Set("email", claims["email"])
		c.Set("role", claims["role"])

		return next(c)
	}
}
