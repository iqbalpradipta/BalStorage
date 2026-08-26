package services

import (
	"balStorage/backend/model"
	"balStorage/backend/repository"
	"balStorage/backend/utils"

	"gorm.io/gorm"
)

type DashboardStats struct {
	TotalFolders      int                     `json:"total_folders"`
	TotalFiles        int                     `json:"total_files"`
	TotalSize         int64                   `json:"total_size"`
	Tier              model.TierInfo          `json:"tier"`
	CategoryBreakdown map[string]CatBreakdown `json:"category_breakdown"`
}

type CatBreakdown struct {
	Size  int64 `json:"size"`
	Count int   `json:"count"`
}

type StorageService interface {
	GetDashboardStats(userID string) (*DashboardStats, error)
	CheckCapacity(userID string, additionalBytes int64) error
	AddStorageUsed(userID string, bytes int64) error
	SubStorageUsed(userID string, bytes int64) error
}

type storageService struct {
	userRepo   repository.UserRepository
	folderRepo repository.FolderRepository
	fileRepo   repository.FileRepository
}

func NewStorageService(
	userRepo repository.UserRepository,
	folderRepo repository.FolderRepository,
	fileRepo repository.FileRepository,
) StorageService {
	return &storageService{
		userRepo:   userRepo,
		folderRepo: folderRepo,
		fileRepo:   fileRepo,
	}
}

func (s *storageService) GetDashboardStats(userID string) (*DashboardStats, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	tierInfo, ok := model.Tiers[user.Tier]
	if !ok {
		tierInfo = model.Tiers[model.TierStandard]
	}

	folders, err := s.folderRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	totalFiles, err := s.fileRepo.CountByUserID(userID)
	if err != nil {
		return nil, err
	}

	rawBreakdown, err := s.fileRepo.GetCategoryBreakdown(userID)
	if err != nil {
		return nil, err
	}

	catBreakdown := make(map[string]CatBreakdown, len(rawBreakdown))
	for cat, cb := range rawBreakdown {
		catBreakdown[cat] = CatBreakdown{Size: cb.Size, Count: int(cb.Count)}
	}

	return &DashboardStats{
		TotalFolders:      len(folders),
		TotalFiles:        int(totalFiles),
		TotalSize:         user.StorageUsed,
		Tier:              tierInfo,
		CategoryBreakdown: catBreakdown,
	}, nil
}

func (s *storageService) CheckCapacity(userID string, additionalBytes int64) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	if model.IsUnlimited(user.Tier) {
		return nil
	}

	limit := model.GetTierLimit(user.Tier)
	if user.StorageUsed+additionalBytes > limit {
		return utils.ErrStorageFull
	}

	return nil
}

func (s *storageService) AddStorageUsed(userID string, bytes int64) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrNotFound
		}
		return err
	}

	user.StorageUsed += bytes
	return s.userRepo.Update(user)
}

func (s *storageService) SubStorageUsed(userID string, bytes int64) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrNotFound
		}
		return err
	}

	user.StorageUsed -= bytes
	if user.StorageUsed < 0 {
		user.StorageUsed = 0
	}
	return s.userRepo.Update(user)
}
