package controllers

import (
	"net/http"
	"strconv"

	"balStorage/backend/helpers"
	"balStorage/backend/model"
	"balStorage/backend/services"
	"balStorage/backend/utils"

	"github.com/labstack/echo/v4"
)

type FileController struct {
	fileService services.FileService
}

func NewFileController(fileService services.FileService) *FileController {
	return &FileController{fileService: fileService}
}

func (c *FileController) ListByFolder(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	role, _ := ctx.Get("role").(string)

	// Admin can list files in any folder
	if role == "admin" {
		userID = ""
	}

	folderID := ctx.Param("id")

	page, _ := strconv.Atoi(ctx.QueryParam("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	files, total, err := c.fileService.ListByFolder(folderID, userID, page, limit)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	if files == nil {
		files = []model.File{}
	}

	return helpers.JSON(ctx, http.StatusOK, true, "files fetched", echo.Map{
		"data": files,
		"pagination": echo.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

func (c *FileController) Upload(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	folderID := ctx.Param("id")

	form, err := ctx.MultipartForm()
	if err != nil {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "multipart form required", nil)
	}

	files := form.File["files"]
	if len(files) == 0 {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "at least one file is required", nil)
	}

	uploadDir := utils.GetEnv("UPLOAD_DIR", "uploads")

	results, err := c.fileService.UploadMultiple(userID, folderID, uploadDir, files)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	uploaded := len(results)
	failed := 0
	for _, r := range results {
		if r.Error != "" {
			failed++
		}
	}

	return helpers.JSON(ctx, http.StatusCreated, true, "files uploaded", echo.Map{
		"data":    results,
		"total":   len(files),
		"success": uploaded - failed,
		"failed":  failed,
	})
}

func (c *FileController) GetByID(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	role, _ := ctx.Get("role").(string)

	// Admin can view any file
	if role == "admin" {
		userID = ""
	}

	id := ctx.Param("id")

	file, err := c.fileService.GetByID(id, userID)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "file fetched", file)
}

func (c *FileController) Delete(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	id := ctx.Param("id")

	if err := c.fileService.Delete(id, userID); err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "file deleted", nil)
}
