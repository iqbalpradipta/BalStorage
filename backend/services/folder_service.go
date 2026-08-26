package services

import (
	"fmt"
	"strings"

	"balStorage/backend/model"
	"balStorage/backend/repository"
	"balStorage/backend/utils"

	"gorm.io/gorm"
)

const (
	DiscordChannelModeSettingKey = "discord_channel_mode"
	defaultDiscordChannelMode    = "folder"
)

type FolderService interface {
	Create(userID string, input model.CreateFolderInput) (*model.Folder, error)
	List(userID string, parentID *string, page, limit int, search string) ([]model.Folder, int64, error)
	GetByID(id, userID string) (*model.Folder, error)
	Update(id, userID string, input model.UpdateFolderInput) (*model.Folder, error)
	Delete(id, userID string) error
	GetRootChannelID(folderID string) (string, error)
	RecreateRootChannel(folderID string) (string, error)
}

type folderService struct {
	folderRepo  repository.FolderRepository
	fileRepo    repository.FileRepository
	userRepo    repository.UserRepository
	settingRepo repository.SettingRepository
	discordSvc  DiscordService
}

func NewFolderService(folderRepo repository.FolderRepository, fileRepo repository.FileRepository, userRepo repository.UserRepository, settingRepo repository.SettingRepository, discordSvc DiscordService) FolderService {
	return &folderService{
		folderRepo:  folderRepo,
		fileRepo:    fileRepo,
		userRepo:    userRepo,
		settingRepo: settingRepo,
		discordSvc:  discordSvc,
	}
}

func (s *folderService) Create(userID string, input model.CreateFolderInput) (*model.Folder, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, utils.ErrBadRequest
	}
	parentID := normalizeFolderParentID(input.ParentID)

	// Validate parent if sub-folder
	if parentID != nil {
		parent, err := s.folderRepo.FindByID(*parentID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, utils.ErrNotFound
			}
			return nil, err
		}
		if parent.UserID != userID {
			return nil, utils.ErrForbidden
		}
	}

	existing, err := s.folderRepo.FindByNameUserIDAndParentID(name, userID, parentID)
	if err == nil && existing != nil {
		return nil, utils.ErrConflict
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	var channelID string
	if s.useUserChannelMode() {
		if _, err := s.ensureUserChannel(userID); err != nil {
			return nil, err
		}
	} else {
		// Only create Discord channel for root folders (not sub-folders).
		if parentID == nil {
			channelID, err = s.discordSvc.CreateChannel(name)
			if err != nil {
				return nil, err
			}
		}
	}

	folder := &model.Folder{
		UserID:           userID,
		ParentID:         parentID,
		Name:             name,
		DiscordChannelID: optionalString(channelID),
	}

	if err := s.folderRepo.Create(folder); err != nil {
		if channelID != "" {
			s.discordSvc.DeleteChannel(channelID)
		}
		return nil, err
	}

	return folder, nil
}

func (s *folderService) List(userID string, parentID *string, page, limit int, search string) ([]model.Folder, int64, error) {
	folders, total, err := s.folderRepo.FindByUserIDAndParentID(userID, parentID, page, limit, strings.TrimSpace(search))
	if err != nil {
		return nil, 0, err
	}

	for i := range folders {
		fileCount, _ := s.fileRepo.CountByFolderID(folders[i].ID)
		subFolderCount, _ := s.folderRepo.CountByParentID(folders[i].ID)
		folders[i].FileCount = fileCount + subFolderCount
	}

	return folders, total, nil
}

func (s *folderService) GetByID(id, userID string) (*model.Folder, error) {
	folder, err := s.folderRepo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, utils.ErrNotFound
		}
		return nil, err
	}

	// Admin can access any folder (userID empty = admin mode)
	if userID != "" && folder.UserID != userID {
		return nil, utils.ErrForbidden
	}

	return folder, nil
}

func (s *folderService) Update(id, userID string, input model.UpdateFolderInput) (*model.Folder, error) {
	folder, err := s.GetByID(id, userID)
	if err != nil {
		return nil, err
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, utils.ErrBadRequest
	}
	if name == folder.Name {
		return folder, nil
	}

	existing, err := s.folderRepo.FindByNameUserIDAndParentID(name, folder.UserID, folder.ParentID)
	if err == nil && existing != nil && existing.ID != folder.ID {
		return nil, utils.ErrConflict
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	// In folder mode, root folders own Discord channels. In user mode, folder
	// rename only changes the DB folder name; the user channel stays stable.
	if !s.useUserChannelMode() && hasStringValue(folder.DiscordChannelID) {
		if err := s.discordSvc.RenameChannel(*folder.DiscordChannelID, name); err != nil {
			return nil, err
		}
	}

	folder.Name = name
	if err := s.folderRepo.Update(folder); err != nil {
		return nil, err
	}

	return folder, nil
}

func (s *folderService) Delete(id, userID string) error {
	if _, err := s.GetByID(id, userID); err != nil {
		return err
	}

	descendantIDs, err := s.folderRepo.FindDescendantIDs(id)
	if err != nil {
		return err
	}
	folderIDs := append([]string{id}, descendantIDs...)

	files, err := s.fileRepo.FindByFolderIDsUnscoped(folderIDs)
	if err != nil {
		return err
	}
	var releasedBytes int64
	for _, file := range files {
		if !file.DeletedAt.Valid {
			releasedBytes += file.Size
		}
	}

	if err := s.fileRepo.DeleteByFolderIDs(folderIDs); err != nil {
		return err
	}

	if err := s.folderRepo.DeleteByIDs(folderIDs); err != nil {
		return err
	}

	if releasedBytes > 0 {
		user, err := s.userRepo.FindByID(userID)
		if err != nil {
			return err
		}
		user.StorageUsed -= releasedBytes
		if user.StorageUsed < 0 {
			user.StorageUsed = 0
		}
		return s.userRepo.Update(user)
	}

	return nil
}

// GetRootChannelID walks up the folder tree to find the root folder's DiscordChannelID.
// For root folders, returns their own channel ID. For sub-folders, finds the ancestor's channel.
func (s *folderService) GetRootChannelID(folderID string) (string, error) {
	folder, err := s.folderRepo.FindByID(folderID)
	if err != nil {
		return "", err
	}

	if s.useUserChannelMode() {
		return s.ensureUserChannel(folder.UserID)
	}

	if hasStringValue(folder.DiscordChannelID) {
		return *folder.DiscordChannelID, nil
	}

	// Walk up to find root
	current := folder
	for current.ParentID != nil && *current.ParentID != "" {
		parent, err := s.folderRepo.FindByID(*current.ParentID)
		if err != nil {
			return "", err
		}
		if hasStringValue(parent.DiscordChannelID) {
			return *parent.DiscordChannelID, nil
		}
		current = parent
	}

	return "", gorm.ErrRecordNotFound
}

func (s *folderService) RecreateRootChannel(folderID string) (string, error) {
	folder, err := s.folderRepo.FindByID(folderID)
	if err != nil {
		return "", err
	}

	if s.useUserChannelMode() {
		return s.recreateUserChannel(folder.UserID)
	}

	root, err := s.rootFolder(folder)
	if err != nil {
		return "", err
	}

	channelID, err := s.discordSvc.CreateChannel(root.Name)
	if err != nil {
		return "", err
	}

	root.DiscordChannelID = optionalString(channelID)
	if err := s.folderRepo.Update(root); err != nil {
		s.discordSvc.DeleteChannel(channelID)
		return "", err
	}

	return channelID, nil
}

func optionalString(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return &value
}

func normalizeFolderParentID(parentID *string) *string {
	if parentID == nil {
		return nil
	}
	normalized := strings.TrimSpace(*parentID)
	if normalized == "" {
		return nil
	}
	return &normalized
}

func hasStringValue(value *string) bool {
	return value != nil && strings.TrimSpace(*value) != ""
}

func (s *folderService) useUserChannelMode() bool {
	mode := defaultDiscordChannelMode
	if s.settingRepo != nil {
		if value, err := s.settingRepo.Get(DiscordChannelModeSettingKey); err == nil && value != "" {
			mode = value
		}
	}
	return strings.EqualFold(mode, "user")
}

func (s *folderService) ensureUserChannel(userID string) (string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", err
	}
	if user.DiscordChannelID != "" {
		return user.DiscordChannelID, nil
	}

	userSuffix := user.ID
	if len(userSuffix) > 8 {
		userSuffix = userSuffix[:8]
	}
	channelName := normalizeDiscordChannelName(fmt.Sprintf("%s-%s", user.Name, userSuffix))
	channelID, err := s.discordSvc.CreateChannel(channelName)
	if err != nil {
		return "", err
	}

	user.DiscordChannelID = channelID
	if err := s.userRepo.Update(user); err != nil {
		s.discordSvc.DeleteChannel(channelID)
		return "", err
	}

	return channelID, nil
}

func (s *folderService) recreateUserChannel(userID string) (string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", err
	}

	channelID, err := s.createUserChannel(user)
	if err != nil {
		return "", err
	}

	user.DiscordChannelID = channelID
	if err := s.userRepo.Update(user); err != nil {
		s.discordSvc.DeleteChannel(channelID)
		return "", err
	}

	return channelID, nil
}

func (s *folderService) createUserChannel(user *model.User) (string, error) {
	userSuffix := user.ID
	if len(userSuffix) > 8 {
		userSuffix = userSuffix[:8]
	}
	channelName := normalizeDiscordChannelName(fmt.Sprintf("%s-%s", user.Name, userSuffix))
	return s.discordSvc.CreateChannel(channelName)
}

func (s *folderService) rootFolder(folder *model.Folder) (*model.Folder, error) {
	current := folder
	for current.ParentID != nil && *current.ParentID != "" {
		parent, err := s.folderRepo.FindByID(*current.ParentID)
		if err != nil {
			return nil, err
		}
		current = parent
	}
	return current, nil
}

func normalizeDiscordChannelName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	var b strings.Builder
	lastDash := false

	for _, r := range name {
		valid := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if valid {
			b.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			b.WriteByte('-')
			lastDash = true
		}
	}

	result := strings.Trim(b.String(), "-")
	if result == "" {
		result = "user-storage"
	}
	if len(result) > 90 {
		result = strings.Trim(result[:90], "-")
	}
	return result
}
