package services

import (
	"mime/multipart"
	"path/filepath"
	"strings"

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
	ListByUser(userID string, page, limit int) ([]model.File, int64, error)
	GetByID(id, userID string) (*model.File, error)
	RefreshAttachmentURL(file *model.File) (string, error)
	Rename(id, userID, newName string) (*model.File, error)
	Delete(id, userID string) error
}

func (s *fileService) ListByUser(userID string, page, limit int) ([]model.File, int64, error) {
	return s.fileRepo.FindByUserID(userID, page, limit)
}

type fileService struct {
	fileRepo   repository.FileRepository
	folderRepo repository.FolderRepository
	folderSvc  FolderService
	discordSvc DiscordService
	storageSvc StorageService
}

type discordUploadResult struct {
	ChannelID     string
	MessageID     string
	AttachmentURL string
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

	discordFile, err := s.sendFileToDiscord(folder, uploaded.OriginalName, uploaded.FilePath)
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
		DiscordChannelID:     discordFile.ChannelID,
		DiscordMessageID:     discordFile.MessageID,
		DiscordAttachmentURL: discordFile.AttachmentURL,
	}

	if err := s.fileRepo.Create(file); err != nil {
		s.discordSvc.DeleteMessage(discordFile.ChannelID, discordFile.MessageID)
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

	discordFile, err := s.sendFileToDiscord(folder, uploaded.OriginalName, uploaded.FilePath)
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
		DiscordChannelID:     discordFile.ChannelID,
		DiscordMessageID:     discordFile.MessageID,
		DiscordAttachmentURL: discordFile.AttachmentURL,
	}

	if err := s.fileRepo.Create(file); err != nil {
		s.discordSvc.DeleteMessage(discordFile.ChannelID, discordFile.MessageID)
		CleanupTempFile(uploaded.FilePath)
		return nil, err
	}

	if err := s.storageSvc.AddStorageUsed(userID, uploaded.Size); err != nil {
		s.discordSvc.DeleteMessage(discordFile.ChannelID, discordFile.MessageID)
		s.fileRepo.Delete(file.ID)
		CleanupTempFile(uploaded.FilePath)
		return nil, err
	}

	CleanupTempFile(uploaded.FilePath)
	return file, nil
}

func (s *fileService) sendFileToDiscord(folder *model.Folder, filename, path string) (*discordUploadResult, error) {
	channelID, folderLabel := s.resolveChannelAndLabel(folder)
	if channelID == "" {
		refreshedChannelID, err := s.folderSvc.RecreateRootChannel(folder.ID)
		if err != nil {
			return nil, err
		}
		channelID = refreshedChannelID
	}

	messageID, attachmentURL, err := s.discordSvc.SendFile(channelID, folderLabel, filename, path)
	if IsDiscordUnknownChannelError(err) {
		refreshedChannelID, refreshErr := s.folderSvc.RecreateRootChannel(folder.ID)
		if refreshErr != nil {
			return nil, refreshErr
		}
		channelID = refreshedChannelID
		messageID, attachmentURL, err = s.discordSvc.SendFile(channelID, folderLabel, filename, path)
	}
	if err != nil {
		return nil, err
	}

	return &discordUploadResult{
		ChannelID:     channelID,
		MessageID:     messageID,
		AttachmentURL: attachmentURL,
	}, nil
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

func (s *fileService) RefreshAttachmentURL(file *model.File) (string, error) {
	if file == nil || file.DiscordMessageID == "" {
		return "", utils.ErrNotFound
	}

	channelID := strings.TrimSpace(file.DiscordChannelID)
	if channelID == "" {
		folder, err := s.folderRepo.FindByID(file.FolderID)
		if err != nil {
			return "", err
		}
		channelID, _ = s.resolveChannelAndLabel(folder)
	}
	if channelID == "" {
		return "", gorm.ErrRecordNotFound
	}

	attachmentURL, err := s.discordSvc.GetMessageAttachment(channelID, file.DiscordMessageID)
	if err != nil {
		return "", err
	}

	file.DiscordChannelID = channelID
	file.DiscordAttachmentURL = attachmentURL
	if err := s.fileRepo.Update(file); err != nil {
		return "", err
	}

	return attachmentURL, nil
}

func (s *fileService) Rename(id, userID, newName string) (*model.File, error) {
	file, err := s.GetByID(id, userID)
	if err != nil {
		return nil, err
	}

	newName = strings.TrimSpace(newName)
	if !isValidFileDisplayName(newName) {
		return nil, utils.ErrInvalidFileName
	}

	folder, err := s.folderRepo.FindByID(file.FolderID)
	if err != nil {
		return nil, err
	}

	channelID := strings.TrimSpace(file.DiscordChannelID)
	label := s.folderPathLabel(folder)
	if channelID == "" {
		channelID, label = s.resolveChannelAndLabel(folder)
	}
	if channelID == "" {
		return nil, gorm.ErrRecordNotFound
	}

	if err := s.discordSvc.RenameFileMessage(channelID, file.DiscordMessageID, label, newName); err != nil {
		return nil, err
	}

	file.OriginalName = newName
	if err := s.fileRepo.Update(file); err != nil {
		return nil, err
	}

	return file, nil
}

func (s *fileService) Delete(id, userID string) error {
	file, err := s.GetByID(id, userID)
	if err != nil {
		return err
	}

	if err := s.fileRepo.Delete(id); err != nil {
		return err
	}

	return s.storageSvc.SubStorageUsed(userID, file.Size)
}

// resolveChannelAndLabel returns the Discord channel ID and folder path label for the bot message.
// The channel is resolved by FolderService so it can follow either folder-channel or user-channel mode.
func (s *fileService) resolveChannelAndLabel(folder *model.Folder) (channelID, label string) {
	channelID, err := s.folderSvc.GetRootChannelID(folder.ID)
	if err != nil {
		return "", folder.Name
	}

	return channelID, s.folderPathLabel(folder)
}

func (s *fileService) folderPathLabel(folder *model.Folder) string {
	parts := []string{folder.Name}
	current := folder

	for current.ParentID != nil && *current.ParentID != "" {
		parent, err := s.folderRepo.FindByID(*current.ParentID)
		if err != nil {
			break
		}
		parts = append([]string{parent.Name}, parts...)
		current = parent
	}

	return strings.Join(parts, "/")
}

func isValidFileDisplayName(name string) bool {
	if name == "" || len(name) > 255 {
		return false
	}
	base := filepath.Base(name)
	return base == name && !strings.ContainsAny(name, `/\`)
}
