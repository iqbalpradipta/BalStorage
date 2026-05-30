package controllers

import (
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"

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

func (c *FileController) Preview(ctx echo.Context) error {
	return c.proxyAttachment(ctx, false)
}

func (c *FileController) Download(ctx echo.Context) error {
	return c.proxyAttachment(ctx, true)
}

type updateFileInput struct {
	Name string `json:"name"`
}

func (c *FileController) Update(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	id := ctx.Param("id")

	var input updateFileInput
	if err := ctx.Bind(&input); err != nil || input.Name == "" {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "name is required", nil)
	}

	file, err := c.fileService.Rename(id, userID, input.Name)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "file renamed", file)
}

func (c *FileController) Delete(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)
	id := ctx.Param("id")

	if err := c.fileService.Delete(id, userID); err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "file deleted", nil)
}

func (c *FileController) proxyAttachment(ctx echo.Context, forceDownload bool) error {
	userID := ctx.Get("user_id").(string)
	role, _ := ctx.Get("role").(string)
	if role == "admin" {
		userID = ""
	}

	file, err := c.fileService.GetByID(ctx.Param("id"), userID)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	attachmentURL := strings.TrimSpace(file.DiscordAttachmentURL)
	if attachmentURL == "" {
		return helpers.JSON(ctx, http.StatusNotFound, false, "file attachment not found", nil)
	}
	if !isAllowedAttachmentURL(attachmentURL) {
		return helpers.JSON(ctx, http.StatusBadGateway, false, "invalid attachment source", nil)
	}

	req, err := http.NewRequestWithContext(ctx.Request().Context(), http.MethodGet, attachmentURL, nil)
	if err != nil {
		return helpers.JSON(ctx, http.StatusBadGateway, false, "invalid attachment source", nil)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return helpers.JSON(ctx, http.StatusBadGateway, false, "failed to fetch attachment", nil)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return helpers.JSON(ctx, http.StatusBadGateway, false, "failed to fetch attachment", nil)
	}

	filename := safeAttachmentFilename(file.OriginalName)
	contentType := file.MimeType
	if contentType == "" {
		contentType = resp.Header.Get("Content-Type")
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	disposition := "inline"
	if forceDownload {
		disposition = "attachment"
	}
	ctx.Response().Header().Set(echo.HeaderContentType, contentType)
	ctx.Response().Header().Set(echo.HeaderContentDisposition, mime.FormatMediaType(disposition, map[string]string{"filename": filename}))
	ctx.Response().Header().Set("X-Content-Type-Options", "nosniff")
	ctx.Response().Header().Set("Cache-Control", "private, no-store")
	if resp.ContentLength > 0 {
		ctx.Response().Header().Set(echo.HeaderContentLength, fmt.Sprintf("%d", resp.ContentLength))
	}

	ctx.Response().WriteHeader(http.StatusOK)
	_, err = io.Copy(ctx.Response(), resp.Body)
	return err
}

func isAllowedAttachmentURL(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme != "https" {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	return host == "cdn.discordapp.com" ||
		host == "media.discordapp.net" ||
		strings.HasSuffix(host, ".discordapp.com") ||
		strings.HasSuffix(host, ".discordapp.net")
}

func safeAttachmentFilename(name string) string {
	name = strings.TrimSpace(filepath.Base(name))
	if name == "." || name == string(filepath.Separator) || name == "" {
		return "download"
	}
	return strings.Map(func(r rune) rune {
		switch r {
		case '/', '\\', '\x00', '\r', '\n':
			return -1
		default:
			return r
		}
	}, name)
}
