package helpers

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"balStorage/backend/utils"

	"github.com/google/uuid"
)

type UploadedFile struct {
	OriginalName string
	StoredName   string
	MimeType     string
	Size         int64
	FilePath     string
}

func SaveUploadedFile(file *multipart.FileHeader, uploadDir string) (*UploadedFile, error) {
	maxSizeMB := utils.GetEnv("MAX_FILE_SIZE_MB", "25")
	var maxSize int
	fmt.Sscanf(maxSizeMB, "%d", &maxSize)
	if maxSize <= 0 {
		maxSize = 25
	}

	maxSizeBytes := int64(maxSize) * 1024 * 1024
	if file.Size > maxSizeBytes {
		return nil, fmt.Errorf("file size exceeds %dMB limit", maxSize)
	}

	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" {
		buf := make([]byte, 512)
		n, _ := src.Read(buf)
		src.Seek(0, io.SeekStart)
		mimeType = detectContentType(buf[:n])
	}

	ext := filepath.Ext(file.Filename)
	storedName := uuid.New().String() + ext
	filePath := filepath.Join(uploadDir, storedName)

	dst, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		os.Remove(filePath)
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	return &UploadedFile{
		OriginalName: storedName,
		StoredName:   storedName,
		MimeType:     mimeType,
		Size:         file.Size,
		FilePath:     filePath,
	}, nil
}

func GenerateStoredName(originalName string) string {
	ext := filepath.Ext(originalName)
	return uuid.New().String() + ext
}

func GenerateFilePath(uploadDir, storedName string) string {
	return filepath.Join(uploadDir, storedName)
}

func detectContentType(buf []byte) string {
	mimeTypes := map[string]string{
		"\xff\xd8\xff":      "image/jpeg",
		"\x89PNG\r\n\x1a\n": "image/png",
		"GIF89a":            "image/gif",
		"GIF87a":            "image/gif",
		"RIFF":              "image/webp",
		"%PDF":              "application/pdf",
		"PK\x03\x04":        "application/zip",
	}

	for magic, mime := range mimeTypes {
		if strings.HasPrefix(string(buf), magic) {
			return mime
		}
	}

	return "application/octet-stream"
}

func IsImage(mimeType string) bool {
	return strings.HasPrefix(mimeType, "image/")
}

func TimeAgo(t time.Time) string {
	duration := time.Since(t)
	switch {
	case duration < time.Minute:
		return "just now"
	case duration < time.Hour:
		minutes := int(duration.Minutes())
		if minutes == 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", minutes)
	case duration < 24*time.Hour:
		hours := int(duration.Hours())
		if hours == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", hours)
	default:
		days := int(duration.Hours() / 24)
		if days == 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", days)
	}
}
