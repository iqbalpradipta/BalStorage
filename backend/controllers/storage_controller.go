package controllers

import (
	"net/http"

	"balStorage/backend/helpers"
	"balStorage/backend/services"

	"github.com/labstack/echo/v4"
)

type StorageController struct {
	storageService services.StorageService
}

func NewStorageController(storageService services.StorageService) *StorageController {
	return &StorageController{storageService: storageService}
}

func (c *StorageController) GetStats(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)

	stats, err := c.storageService.GetDashboardStats(userID)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "stats fetched", stats)
}
