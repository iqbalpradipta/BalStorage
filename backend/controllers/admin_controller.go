package controllers

import (
	"net/http"
	"strconv"

	"balStorage/backend/helpers"
	"balStorage/backend/services"

	"github.com/labstack/echo/v4"
)

type AdminController struct {
	adminService services.AdminService
}

func NewAdminController(adminService services.AdminService) *AdminController {
	return &AdminController{adminService: adminService}
}

func (c *AdminController) ListUsers(ctx echo.Context) error {
	page, _ := strconv.Atoi(ctx.QueryParam("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query := ctx.QueryParam("q")

	users, total, err := c.adminService.ListUsers(page, limit, query)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "users fetched", echo.Map{
		"data": users,
		"pagination": echo.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

type updateTierInput struct {
	Tier string `json:"tier"`
}

func (c *AdminController) UpdateTier(ctx echo.Context) error {
	userID := ctx.Param("id")

	var input updateTierInput
	if err := ctx.Bind(&input); err != nil || input.Tier == "" {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "tier is required", nil)
	}

	user, err := c.adminService.UpdateUserTier(userID, input.Tier)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "user tier updated", user)
}
