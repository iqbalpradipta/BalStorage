package helpers

import (
	"errors"
	"log"
	"net/http"

	"balStorage/backend/utils"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func JSON(c echo.Context, status int, success bool, message string, data interface{}) error {
	return c.JSON(status, Response{
		Success: success,
		Message: message,
		Data:    data,
	})
}

func HandleError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, utils.ErrBadRequest):
		return JSON(c, http.StatusBadRequest, false, err.Error(), nil)
	case errors.Is(err, utils.ErrNotFound):
		return JSON(c, http.StatusNotFound, false, err.Error(), nil)
	case errors.Is(err, utils.ErrConflict):
		return JSON(c, http.StatusConflict, false, err.Error(), nil)
	case errors.Is(err, utils.ErrForbidden):
		return JSON(c, http.StatusForbidden, false, err.Error(), nil)
	case errors.Is(err, gorm.ErrRecordNotFound):
		return JSON(c, http.StatusNotFound, false, "resource not found", nil)
	case errors.Is(err, echo.ErrUnauthorized):
		return JSON(c, http.StatusUnauthorized, false, "unauthorized", nil)
	default:
		log.Printf("internal error: %v", err)
		return JSON(c, http.StatusInternalServerError, false, err.Error(), nil)
	}
}
