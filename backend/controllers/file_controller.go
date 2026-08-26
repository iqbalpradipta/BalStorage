package controllers

import (
	"fmt"
	"image"
	"image/color"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	_ "golang.org/x/image/webp"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

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

func (c *FileController) ListByUser(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)

	page, _ := strconv.Atoi(ctx.QueryParam("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	files, total, err := c.fileService.ListByUser(userID, page, limit)
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

func (c *FileController) Thumbnail(ctx echo.Context) error {
	file, err := c.fileService.GetByID(ctx.Param("id"), "")
	if err != nil {
		return helpers.HandleError(ctx, err)
	}
	if !strings.HasPrefix(strings.ToLower(file.MimeType), "image/") {
		return helpers.JSON(ctx, http.StatusUnsupportedMediaType, false, "thumbnail is only available for images", nil)
	}

	size, _ := strconv.Atoi(ctx.QueryParam("size"))
	if size <= 0 {
		size = 320
	}
	if size < 96 {
		size = 96
	}
	if size > 640 {
		size = 640
	}

	cachePath := services.ThumbnailCachePath(file.ID, size)
	if _, err := os.Stat(cachePath); err == nil {
		return serveThumbnailFile(ctx, file.OriginalName, cachePath)
	}

	resp, err := c.fetchAttachmentWithRefresh(ctx, file)
	if err != nil {
		return helpers.JSON(ctx, http.StatusBadGateway, false, "failed to fetch attachment", nil)
	}
	defer resp.Body.Close()

	img, _, err := image.Decode(resp.Body)
	if err != nil {
		return helpers.JSON(ctx, http.StatusUnsupportedMediaType, false, "image format is not supported for thumbnail", nil)
	}

	thumbnail := resizeForThumbnail(img, size)
	if err := writeThumbnailCache(cachePath, thumbnail); err == nil {
		return serveThumbnailFile(ctx, file.OriginalName, cachePath)
	}

	ctx.Response().Header().Set(echo.HeaderContentType, "image/jpeg")
	ctx.Response().Header().Set(echo.HeaderContentDisposition, mime.FormatMediaType("inline", map[string]string{"filename": safeAttachmentFilename(file.OriginalName) + ".jpg"}))
	ctx.Response().Header().Set("X-Content-Type-Options", "nosniff")
	ctx.Response().Header().Set("Cache-Control", "private, max-age=86400")
	ctx.Response().WriteHeader(http.StatusOK)
	return jpeg.Encode(ctx.Response(), thumbnail, &jpeg.Options{Quality: 72})
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
	userID := ""
	if forceDownload {
		userID = ctx.Get("user_id").(string)
		role, _ := ctx.Get("role").(string)
		if role == "admin" {
			userID = ""
		}
	}

	file, err := c.fileService.GetByID(ctx.Param("id"), userID)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	resp, err := c.fetchAttachmentWithRefresh(ctx, file)
	if err != nil {
		return helpers.JSON(ctx, http.StatusBadGateway, false, "failed to fetch attachment", nil)
	}
	defer resp.Body.Close()

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

func (c *FileController) fetchAttachmentWithRefresh(ctx echo.Context, file *model.File) (*http.Response, error) {
	resp, err := fetchAllowedAttachment(ctx, file.DiscordAttachmentURL)
	if err == nil {
		return resp, nil
	}

	refreshedURL, refreshErr := c.fileService.RefreshAttachmentURL(file)
	if refreshErr != nil {
		return nil, err
	}

	return fetchAllowedAttachment(ctx, refreshedURL)
}

func fetchAllowedAttachment(ctx echo.Context, attachmentURL string) (*http.Response, error) {
	attachmentURL = strings.TrimSpace(attachmentURL)
	if attachmentURL == "" || !isAllowedAttachmentURL(attachmentURL) {
		return nil, fmt.Errorf("invalid attachment source")
	}

	req, err := http.NewRequestWithContext(ctx.Request().Context(), http.MethodGet, attachmentURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		resp.Body.Close()
		return nil, fmt.Errorf("attachment returned status %d", resp.StatusCode)
	}
	return resp, nil
}

func resizeForThumbnail(src image.Image, maxSize int) image.Image {
	bounds := src.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width <= 0 || height <= 0 {
		return image.NewRGBA(image.Rect(0, 0, 1, 1))
	}

	targetW := width
	targetH := height
	if width > maxSize || height > maxSize {
		if width >= height {
			targetW = maxSize
			targetH = height * maxSize / width
		} else {
			targetH = maxSize
			targetW = width * maxSize / height
		}
	}
	if targetW < 1 {
		targetW = 1
	}
	if targetH < 1 {
		targetH = 1
	}

	dst := image.NewRGBA(image.Rect(0, 0, targetW, targetH))
	for y := 0; y < targetH; y++ {
		sourceY := bounds.Min.Y + y*height/targetH
		for x := 0; x < targetW; x++ {
			sourceX := bounds.Min.X + x*width/targetW
			dst.SetRGBA(x, y, flattenOverDark(src.At(sourceX, sourceY)))
		}
	}
	return dst
}

func writeThumbnailCache(path string, img image.Image) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	tempFile, err := os.CreateTemp(filepath.Dir(path), "thumb-*.jpg")
	if err != nil {
		return err
	}
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)

	if err := jpeg.Encode(tempFile, img, &jpeg.Options{Quality: 72}); err != nil {
		tempFile.Close()
		return err
	}
	if err := tempFile.Close(); err != nil {
		return err
	}

	if _, err := os.Stat(path); err == nil {
		return nil
	}
	return os.Rename(tempPath, path)
}

func serveThumbnailFile(ctx echo.Context, originalName string, path string) error {
	_ = os.Chtimes(path, time.Now(), time.Now())

	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return err
	}

	ctx.Response().Header().Set(echo.HeaderContentType, "image/jpeg")
	ctx.Response().Header().Set(echo.HeaderContentDisposition, mime.FormatMediaType("inline", map[string]string{"filename": safeAttachmentFilename(originalName) + ".jpg"}))
	ctx.Response().Header().Set("X-Content-Type-Options", "nosniff")
	ctx.Response().Header().Set("Cache-Control", "private, max-age=86400")
	ctx.Response().Header().Set(echo.HeaderContentLength, fmt.Sprintf("%d", stat.Size()))
	ctx.Response().WriteHeader(http.StatusOK)
	_, err = io.Copy(ctx.Response(), file)
	return err
}

func flattenOverDark(c color.Color) color.RGBA {
	const bgR, bgG, bgB = 15, 23, 42
	r, g, b, a := c.RGBA()
	alpha := uint64(a)
	inverse := uint64(65535) - alpha

	return color.RGBA{
		R: uint8(((uint64(r)*alpha + uint64(bgR*257)*inverse) / 65535) / 257),
		G: uint8(((uint64(g)*alpha + uint64(bgG*257)*inverse) / 65535) / 257),
		B: uint8(((uint64(b)*alpha + uint64(bgB*257)*inverse) / 65535) / 257),
		A: 255,
	}
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
