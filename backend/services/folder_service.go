package services

import (
	"balStorage/backend/model"
	"balStorage/backend/repository"
	"balStorage/backend/utils"

	"gorm.io/gorm"
)

type FolderService interface {
	Create(userID string, input model.CreateFolderInput) (*model.Folder, error)
	List(userID string, parentID *string) ([]model.Folder, error)
	GetByID(id, userID string) (*model.Folder, error)
	Update(id, userID string, input model.UpdateFolderInput) (*model.Folder, error)
	Delete(id, userID string) error
	GetRootChannelID(folderID string) (string, error)
}

type folderService struct {
	folderRepo repository.FolderRepository
	fileRepo   repository.FileRepository
	discordSvc DiscordService
}

func NewFolderService(folderRepo repository.FolderRepository, fileRepo repository.FileRepository, discordSvc DiscordService) FolderService {
	return &folderService{
		folderRepo: folderRepo,
		fileRepo:   fileRepo,
		discordSvc: discordSvc,
	}
}

func (s *folderService) Create(userID string, input model.CreateFolderInput) (*model.Folder, error) {
	if input.Name == "" {
		return nil, utils.ErrBadRequest
	}

	existing, err := s.folderRepo.FindByNameAndUserID(input.Name, userID)
	if err == nil && existing != nil {
		return nil, utils.ErrConflict
	}

	// Validate parent if sub-folder
	if input.ParentID != nil && *input.ParentID != "" {
		parent, err := s.folderRepo.FindByID(*input.ParentID)
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

	var channelID string
	// Only create Discord channel for root folders (not sub-folders)
	if input.ParentID == nil || *input.ParentID == "" {
		channelID, err = s.discordSvc.CreateChannel(input.Name)
		if err != nil {
			return nil, err
		}
	}

	folder := &model.Folder{
		UserID:           userID,
		ParentID:         input.ParentID,
		Name:             input.Name,
		DiscordChannelID: channelID,
	}

	if err := s.folderRepo.Create(folder); err != nil {
		if channelID != "" {
			s.discordSvc.DeleteChannel(channelID)
		}
		return nil, err
	}

	return folder, nil
}

func (s *folderService) List(userID string, parentID *string) ([]model.Folder, error) {
	folders, err := s.folderRepo.FindByUserIDAndParentID(userID, parentID)
	if err != nil {
		return nil, err
	}

	for i := range folders {
		count, _ := s.fileRepo.CountByFolderID(folders[i].ID)
		folders[i].FileCount = count
	}

	return folders, nil
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

	if input.Name == "" {
		return nil, utils.ErrBadRequest
	}

	// Only rename Discord channel for root folders
	if folder.DiscordChannelID != "" {
		if err := s.discordSvc.RenameChannel(folder.DiscordChannelID, input.Name); err != nil {
			return nil, err
		}
	}

	folder.Name = input.Name
	if err := s.folderRepo.Update(folder); err != nil {
		return nil, err
	}

	return folder, nil
}

func (s *folderService) Delete(id, userID string) error {
	folder, err := s.GetByID(id, userID)
	if err != nil {
		return err
	}

	// Delete sub-folders from DB (they have no Discord channels)
	s.folderRepo.DeleteByParentID(id)

	// Only delete Discord channel for root folders
	if folder.DiscordChannelID != "" {
		if err := s.discordSvc.DeleteChannel(folder.DiscordChannelID); err != nil {
			return err
		}
	}

	return s.folderRepo.Delete(id)
}

// GetRootChannelID walks up the folder tree to find the root folder's DiscordChannelID.
// For root folders, returns their own channel ID. For sub-folders, finds the ancestor's channel.
func (s *folderService) GetRootChannelID(folderID string) (string, error) {
	folder, err := s.folderRepo.FindByID(folderID)
	if err != nil {
		return "", err
	}

	if folder.DiscordChannelID != "" {
		return folder.DiscordChannelID, nil
	}

	// Walk up to find root
	current := folder
	for current.ParentID != nil && *current.ParentID != "" {
		parent, err := s.folderRepo.FindByID(*current.ParentID)
		if err != nil {
			return "", err
		}
		if parent.DiscordChannelID != "" {
			return parent.DiscordChannelID, nil
		}
		current = parent
	}

	return "", gorm.ErrRecordNotFound
}
