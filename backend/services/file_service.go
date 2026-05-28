package services

import (
	"fmt"
	"mime/multipart"

	"balStorage/backend/helpers"
	"balStorage/backend/model"
	"balStorage/backend/repository"
	"balStorage/backend/utils"

	"gorm.io/gorm"
)

type UploadResult struct {
	OriginalName string      `json:"original_name"`
	Success      bool        `json:"success"`
	Error        string      `json:"error,omitempty"`
	File         *model.File `json:"file,omitempty"`
}

type FileService interface {
	Upload(userID, folderID, uploadDir string, fileHeader *multipart.FileHeader) (*model.File, error)
	UploadMultiple(userID, folderID, uploadDir string, fileHeaders []*multipart.FileHeader) ([]UploadResult, error)
	ListByFolder(folderID, userID string, page, limit int) ([]model.File, int64, error)
	GetByID(id, userID string) (*model.File, error)
	Delete(id, userID string) error
}

type fileService struct {
	fileRepo   repository.FileRepository
	folderRepo repository.FolderRepository
	folderSvc  FolderService
	discordSvc DiscordService
	storageSvc StorageService
}

func NewFileService(
	fileRepo repository.FileRepository,
	folderRepo repository.FolderRepository,
	folderSvc FolderService,
	discordSvc DiscordService,
	storageSvc StorageService,
) FileService {
	return &fileService{
		fileRepo:   fileRepo,
		folderRepo: folderRepo,
		folderSvc:  folderSvc,
		discordSvc: discordSvc,
		storageSvc: storageSvc,
	}
}

func (s *fileService) Upload(userID, folderID, uploadDir string, fileHeader *multipart.FileHeader) (*model.File, error) {
	folder, err := s.folderRepo.FindByID(folderID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, utils.ErrNotFound
		}
		return nil, err
	}

	if folder.UserID != userID {
		return nil, utils.ErrForbidden
	}

	uploaded, err := helpers.SaveUploadedFile(fileHeader, uploadDir)
	if err != nil {
		return nil, err
	}

	channelID, folderLabel := s.resolveChannelAndLabel(folder)

	messageID, attachmentURL, err := s.discordSvc.SendFile(
		channelID,
		folderLabel,
		uploaded.OriginalName,
		uploaded.FilePath,
	)
	if err != nil {
		CleanupTempFile(uploaded.FilePath)
		return nil, err
	}

	file := &model.File{
		FolderID:             folderID,
		UserID:               userID,
		OriginalName:         uploaded.OriginalName,
		StoredName:           uploaded.StoredName,
		MimeType:             uploaded.MimeType,
		Size:                 uploaded.Size,
		DiscordMessageID:     messageID,
		DiscordAttachmentURL: attachmentURL,
	}

	if err := s.fileRepo.Create(file); err != nil {
		s.discordSvc.DeleteMessage(channelID, messageID)
		CleanupTempFile(uploaded.FilePath)
		return nil, err
	}

	CleanupTempFile(uploaded.FilePath)

	return file, nil
}

func (s *fileService) UploadMultiple(userID, folderID, uploadDir string, fileHeaders []*multipart.FileHeader) ([]UploadResult, error) {
	folder, err := s.folderRepo.FindByID(folderID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, utils.ErrNotFound
		}
		return nil, err
	}

	if folder.UserID != userID {
		return nil, utils.ErrForbidden
	}

	results := make([]UploadResult, 0, len(fileHeaders))
	for _, fh := range fileHeaders {
		result := UploadResult{OriginalName: fh.Filename}
		file, err := s.uploadSingle(folder, userID, uploadDir, fh)
		if err != nil {
			result.Error = err.Error()
			results = append(results, result)
			continue
		}
		result.Success = true
		result.File = file
		results = append(results, result)
	}

	return results, nil
}

func (s *fileService) uploadSingle(folder *model.Folder, userID, uploadDir string, fileHeader *multipart.FileHeader) (*model.File, error) {
	if err := s.storageSvc.CheckCapacity(userID, fileHeader.Size); err != nil {
		return nil, err
	}

	uploaded, err := helpers.SaveUploadedFile(fileHeader, uploadDir)
	if err != nil {
		return nil, err
	}

	channelID, folderLabel := s.resolveChannelAndLabel(folder)

	messageID, attachmentURL, err := s.discordSvc.SendFile(
		channelID,
		folderLabel,
		uploaded.OriginalName,
		uploaded.FilePath,
	)
	if err != nil {
		CleanupTempFile(uploaded.FilePath)
		return nil, err
	}

	file := &model.File{
		FolderID:             folder.ID,
		UserID:               userID,
		OriginalName:         uploaded.OriginalName,
		StoredName:           uploaded.StoredName,
		MimeType:             uploaded.MimeType,
		Size:                 uploaded.Size,
		DiscordMessageID:     messageID,
		DiscordAttachmentURL: attachmentURL,
	}

	if err := s.fileRepo.Create(file); err != nil {
		s.discordSvc.DeleteMessage(channelID, messageID)
		CleanupTempFile(uploaded.FilePath)
		return nil, err
	}

	if err := s.storageSvc.AddStorageUsed(userID, uploaded.Size); err != nil {
		s.discordSvc.DeleteMessage(channelID, messageID)
		s.fileRepo.Delete(file.ID)
		CleanupTempFile(uploaded.FilePath)
		return nil, err
	}

	CleanupTempFile(uploaded.FilePath)
	return file, nil
}

func (s *fileService) ListByFolder(folderID, userID string, page, limit int) ([]model.File, int64, error) {
	folder, err := s.folderRepo.FindByID(folderID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, 0, utils.ErrNotFound
		}
		return nil, 0, err
	}

	// Admin can list files in any folder (userID empty = admin mode)
	if userID != "" && folder.UserID != userID {
		return nil, 0, utils.ErrForbidden
	}

	return s.fileRepo.FindByFolderID(folderID, page, limit)
}

func (s *fileService) GetByID(id, userID string) (*model.File, error) {
	file, err := s.fileRepo.FindByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, utils.ErrNotFound
		}
		return nil, err
	}

	// Admin can access any file (userID empty = admin mode)
	if userID != "" && file.UserID != userID {
		return nil, utils.ErrForbidden
	}

	return file, nil
}

func (s *fileService) Delete(id, userID string) error {
	file, err := s.GetByID(id, userID)
	if err != nil {
		return err
	}

	channelID, err := s.folderSvc.GetRootChannelID(file.FolderID)
	if err != nil {
		return err
	}

	if err := s.discordSvc.DeleteMessage(channelID, file.DiscordMessageID); err != nil {
		return err
	}

	if err := s.fileRepo.Delete(id); err != nil {
		return err
	}

	return s.storageSvc.SubStorageUsed(userID, file.Size)
}

// resolveChannelAndLabel returns the Discord channel ID and a folder label for the bot message.
// Root folder: uses its own channel, label = folder name.
// Sub-folder: walks up to root's channel, label = "root/sub".
func (s *fileService) resolveChannelAndLabel(folder *model.Folder) (channelID, label string) {
	label = folder.Name

	if folder.DiscordChannelID != "" {
		return folder.DiscordChannelID, label
	}

	rootID, err := s.folderSvc.GetRootChannelID(folder.ID)
	if err != nil {
		return "", label
	}

	// Build label: "root/sub"
	parent, err := s.folderRepo.FindByID(*folder.ParentID)
	if err == nil {
		label = fmt.Sprintf("%s/%s", parent.Name, folder.Name)
	}

	return rootID, label
}
