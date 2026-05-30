package services

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"balStorage/backend/utils"
)

const (
	thumbnailCacheDefaultTTLDays  = 30
	thumbnailCacheDefaultMaxMB    = 1024
	thumbnailCacheDefaultInterval = 24 * time.Hour
)

type ThumbnailCacheCleanupService struct{}

type thumbnailCacheEntry struct {
	path    string
	size    int64
	modTime time.Time
}

func NewThumbnailCacheCleanupService() *ThumbnailCacheCleanupService {
	return &ThumbnailCacheCleanupService{}
}

func (s *ThumbnailCacheCleanupService) Start(ctx context.Context) {
	if strings.EqualFold(utils.GetEnv("THUMBNAIL_CACHE_CLEANUP_ENABLED", "true"), "false") {
		log.Println("thumbnail cache cleanup disabled")
		return
	}

	interval := thumbnailCacheCleanupInterval()
	go func() {
		s.runAndLog()

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.runAndLog()
			}
		}
	}()
}

func (s *ThumbnailCacheCleanupService) runAndLog() {
	if err := s.RunOnce(); err != nil {
		log.Printf("thumbnail cache cleanup failed: %v", err)
	}
}

func (s *ThumbnailCacheCleanupService) RunOnce() error {
	dir := ThumbnailCacheDir()
	entries, err := os.ReadDir(dir)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}

	cutoff := time.Now().Add(-thumbnailCacheTTL())
	maxBytes := thumbnailCacheMaxBytes()
	cacheEntries := make([]thumbnailCacheEntry, 0, len(entries))
	totalBytes := int64(0)
	removed := 0

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".jpg") {
			continue
		}

		path := filepath.Join(dir, entry.Name())
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			if removeThumbnailCacheFile(path) {
				removed++
			}
			continue
		}

		size := info.Size()
		totalBytes += size
		cacheEntries = append(cacheEntries, thumbnailCacheEntry{
			path:    path,
			size:    size,
			modTime: info.ModTime(),
		})
	}

	if totalBytes > maxBytes {
		sort.Slice(cacheEntries, func(i, j int) bool {
			return cacheEntries[i].modTime.Before(cacheEntries[j].modTime)
		})

		for _, entry := range cacheEntries {
			if totalBytes <= maxBytes {
				break
			}
			if removeThumbnailCacheFile(entry.path) {
				totalBytes -= entry.size
				removed++
			}
		}
	}

	if removed > 0 {
		log.Printf("thumbnail cache cleanup removed %d file(s)", removed)
	}
	return nil
}

func ThumbnailCacheDir() string {
	return filepath.Join(utils.GetEnv("UPLOAD_DIR", "uploads"), "thumbnails")
}

func ThumbnailCachePath(fileID string, size int) string {
	return filepath.Join(ThumbnailCacheDir(), SafeThumbnailCacheKey(fileID)+"_"+strconv.Itoa(size)+".jpg")
}

func DeleteThumbnailCache(fileID string) error {
	pattern := filepath.Join(ThumbnailCacheDir(), SafeThumbnailCacheKey(fileID)+"_*.jpg")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return err
	}

	for _, path := range matches {
		_ = os.Remove(path)
	}
	return nil
}

func SafeThumbnailCacheKey(value string) string {
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, value)
}

func thumbnailCacheTTL() time.Duration {
	days, err := strconv.Atoi(utils.GetEnv("THUMBNAIL_CACHE_TTL_DAYS", strconv.Itoa(thumbnailCacheDefaultTTLDays)))
	if err != nil || days < 1 {
		return time.Duration(thumbnailCacheDefaultTTLDays) * 24 * time.Hour
	}
	return time.Duration(days) * 24 * time.Hour
}

func thumbnailCacheMaxBytes() int64 {
	mb, err := strconv.Atoi(utils.GetEnv("THUMBNAIL_CACHE_MAX_MB", strconv.Itoa(thumbnailCacheDefaultMaxMB)))
	if err != nil || mb < 1 {
		return int64(thumbnailCacheDefaultMaxMB) * 1024 * 1024
	}
	return int64(mb) * 1024 * 1024
}

func thumbnailCacheCleanupInterval() time.Duration {
	hours, err := strconv.Atoi(utils.GetEnv("THUMBNAIL_CACHE_CLEANUP_INTERVAL_HOURS", "24"))
	if err != nil || hours < 1 {
		return thumbnailCacheDefaultInterval
	}
	return time.Duration(hours) * time.Hour
}

func removeThumbnailCacheFile(path string) bool {
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return false
	}
	return true
}
