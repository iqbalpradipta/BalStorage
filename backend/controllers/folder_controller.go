package controllers

import (
	"net/http"
	"strconv"

	"balStorage/backend/helpers"
	"balStorage/backend/model"
	"balStorage/backend/services"

	"github.com/labstack/echo/v4"
)

type FolderController struct {
	folderService services.FolderService
}

func NewFolderController(folderService services.FolderService) *FolderController {
	return &FolderController{folderService: folderService}
}

func (c *FolderController) List(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	role, _ := ctx.Get("role").(string)

	// Admin sees all folders, regular users see only their own
	if role == "admin" {
		userID = ""
	}

	var parentID *string
	if pid := ctx.QueryParam("parent_id"); pid != "" {
		parentID = &pid
	}

	page, _ := strconv.Atoi(ctx.QueryParam("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	search := ctx.QueryParam("search")
	folders, total, err := c.folderService.List(userID, parentID, page, limit, search)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	if folders == nil {
		folders = []model.Folder{}
	}

	return helpers.JSON(ctx, http.StatusOK, true, "folders fetched", echo.Map{
		"data": folders,
		"pagination": echo.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

func (c *FolderController) Create(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)

	var input model.CreateFolderInput
	if err := ctx.Bind(&input); err != nil {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "invalid request body", nil)
	}

	folder, err := c.folderService.Create(userID, input)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusCreated, true, "folder created", folder)
}

func (c *FolderController) GetByID(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	role, _ := ctx.Get("role").(string)

	// Admin can view any folder
	if role == "admin" {
		userID = ""
	}

	id := ctx.Param("id")

	folder, err := c.folderService.GetByID(id, userID)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "folder fetched", folder)
}

func (c *FolderController) Update(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	id := ctx.Param("id")

	var input model.UpdateFolderInput
	if err := ctx.Bind(&input); err != nil {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "invalid request body", nil)
	}

	folder, err := c.folderService.Update(id, userID, input)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "folder updated", folder)
}

func (c *FolderController) Delete(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	id := ctx.Param("id")

	if err := c.folderService.Delete(id, userID); err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "folder deleted", nil)
}
