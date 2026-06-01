package services

import (
	"context"
	"log"
	"strconv"
	"strings"
	"time"

	"balStorage/backend/repository"
	"balStorage/backend/utils"

	"gorm.io/gorm"
)

const (
	deletedItemCleanupDefaultRetentionDays = 30
	deletedItemCleanupDefaultInterval      = 24 * time.Hour
	deletedItemCleanupBatchSize            = 100
)

type DeletedItemCleanupService struct {
	fileRepo    repository.FileRepository
	folderRepo  repository.FolderRepository
	userRepo    repository.UserRepository
	settingRepo repository.SettingRepository
	discordSvc  DiscordService
}

func NewDeletedItemCleanupService(db *gorm.DB, discordSvc DiscordService) *DeletedItemCleanupService {
	return &DeletedItemCleanupService{
		fileRepo:    repository.NewFileRepository(db),
		folderRepo:  repository.NewFolderRepository(db),
		userRepo:    repository.NewUserRepository(db),
		settingRepo: repository.NewSettingRepository(db),
		discordSvc:  discordSvc,
	}
}

func (s *DeletedItemCleanupService) Start(ctx context.Context) {
	if strings.EqualFold(utils.GetEnv("DELETED_ITEMS_CLEANUP_ENABLED", "true"), "false") {
		log.Println("deleted item cleanup disabled")
		return
	}

	interval := deletedItemCleanupInterval()
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

func (s *DeletedItemCleanupService) runAndLog() {
	if err := s.RunOnce(); err != nil {
		log.Printf("deleted item cleanup failed: %v", err)
	}
}

func (s *DeletedItemCleanupService) RunOnce() error {
	cutoff := time.Now().AddDate(0, 0, -deletedItemRetentionDays())

	if err := s.purgeDeletedFiles(cutoff); err != nil {
		return err
	}
	return s.purgeDeletedFolders(cutoff)
}

func (s *DeletedItemCleanupService) purgeDeletedFiles(cutoff time.Time) error {
	files, err := s.fileRepo.FindDeletedBefore(cutoff, deletedItemCleanupBatchSize)
	if err != nil {
		return err
	}

	for _, file := range files {
		if err := s.deleteDiscordMessage(file.FolderID, file.UserID, file.DiscordChannelID, file.DiscordMessageID); err != nil {
			return err
		}
		if err := s.fileRepo.ForceDelete(file.ID); err != nil {
			return err
		}
		if err := DeleteThumbnailCache(file.ID); err != nil {
			log.Printf("failed to delete thumbnail cache for file %s: %v", file.ID, err)
		}
	}

	if len(files) > 0 {
		log.Printf("deleted item cleanup purged %d file(s)", len(files))
	}
	return nil
}

func (s *DeletedItemCleanupService) purgeDeletedFolders(cutoff time.Time) error {
	folders, err := s.folderRepo.FindDeletedBefore(cutoff, deletedItemCleanupBatchSize)
	if err != nil {
		return err
	}

	for _, folder := range folders {
		descendantIDs, err := s.folderRepo.FindDescendantIDsUnscoped(folder.ID)
		if err != nil {
			return err
		}
		folderIDs := append([]string{folder.ID}, descendantIDs...)

		files, err := s.fileRepo.FindByFolderIDsUnscoped(folderIDs)
		if err != nil {
			return err
		}

		releasedByUser := map[string]int64{}
		for _, file := range files {
			if err := s.deleteDiscordMessage(file.FolderID, file.UserID, file.DiscordChannelID, file.DiscordMessageID); err != nil {
				return err
			}
			if !file.DeletedAt.Valid {
				releasedByUser[file.UserID] += file.Size
			}
		}

		if !s.useUserChannelMode() && hasStringValue(folder.DiscordChannelID) {
			if err := s.discordSvc.DeleteChannel(*folder.DiscordChannelID); err != nil && !IsDiscordNotFoundError(err) {
				return err
			}
		}

		fileIDs := make([]string, 0, len(files))
		for _, file := range files {
			fileIDs = append(fileIDs, file.ID)
		}
		if err := s.fileRepo.ForceDeleteByIDs(fileIDs); err != nil {
			return err
		}
		for _, fileID := range fileIDs {
			if err := DeleteThumbnailCache(fileID); err != nil {
				log.Printf("failed to delete thumbnail cache for file %s: %v", fileID, err)
			}
		}
		if err := s.folderRepo.ForceDeleteByIDs(folderIDs); err != nil {
			return err
		}
		if err := s.releaseStorage(releasedByUser); err != nil {
			return err
		}
	}

	if len(folders) > 0 {
		log.Printf("deleted item cleanup purged %d folder tree(s)", len(folders))
	}
	return nil
}

func (s *DeletedItemCleanupService) deleteDiscordMessage(folderID, userID, channelID, messageID string) error {
	if messageID == "" {
		return nil
	}

	channelID = strings.TrimSpace(channelID)
	if channelID == "" {
		resolvedChannelID, err := s.resolveDeletedFileChannel(folderID, userID)
		if err != nil {
			return err
		}
		channelID = resolvedChannelID
	}
	if channelID == "" {
		return nil
	}

	if err := s.discordSvc.DeleteMessage(channelID, messageID); err != nil && !IsDiscordNotFoundError(err) {
		return err
	}
	return nil
}

func (s *DeletedItemCleanupService) resolveDeletedFileChannel(folderID, userID string) (string, error) {
	if s.useUserChannelMode() {
		user, err := s.userRepo.FindByID(userID)
		if err != nil {
			return "", err
		}
		return user.DiscordChannelID, nil
	}

	current, err := s.folderRepo.FindByIDUnscoped(folderID)
	if err != nil {
		return "", err
	}

	for {
		if hasStringValue(current.DiscordChannelID) {
			return *current.DiscordChannelID, nil
		}
		if current.ParentID == nil || *current.ParentID == "" {
			return "", nil
		}
		current, err = s.folderRepo.FindByIDUnscoped(*current.ParentID)
		if err != nil {
			return "", err
		}
	}
}

func (s *DeletedItemCleanupService) releaseStorage(releasedByUser map[string]int64) error {
	for userID, bytes := range releasedByUser {
		if bytes <= 0 {
			continue
		}
		user, err := s.userRepo.FindByID(userID)
		if err != nil {
			return err
		}
		user.StorageUsed -= bytes
		if user.StorageUsed < 0 {
			user.StorageUsed = 0
		}
		if err := s.userRepo.Update(user); err != nil {
			return err
		}
	}
	return nil
}

func (s *DeletedItemCleanupService) useUserChannelMode() bool {
	mode := defaultDiscordChannelMode
	if value, err := s.settingRepo.Get(DiscordChannelModeSettingKey); err == nil && value != "" {
		mode = value
	}
	return strings.EqualFold(mode, "user")
}

func deletedItemRetentionDays() int {
	days, err := strconv.Atoi(utils.GetEnv("DELETED_ITEMS_RETENTION_DAYS", strconv.Itoa(deletedItemCleanupDefaultRetentionDays)))
	if err != nil || days < 1 {
		return deletedItemCleanupDefaultRetentionDays
	}
	return days
}

func deletedItemCleanupInterval() time.Duration {
	hours, err := strconv.Atoi(utils.GetEnv("DELETED_ITEMS_CLEANUP_INTERVAL_HOURS", "24"))
	if err != nil || hours < 1 {
		return deletedItemCleanupDefaultInterval
	}
	return time.Duration(hours) * time.Hour
}
