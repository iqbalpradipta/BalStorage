package services

import (
	"balStorage/backend/model"
	"balStorage/backend/repository"
	"balStorage/backend/utils"

	"gorm.io/gorm"
)

type AdminService interface {
	ListUsers(page, limit int, query string) ([]model.User, int64, error)
	UpdateUserTier(userID, tier string) (*model.User, error)
}

type adminService struct {
	userRepo repository.UserRepository
}

func NewAdminService(userRepo repository.UserRepository) AdminService {
	return &adminService{userRepo: userRepo}
}

func (s *adminService) ListUsers(page, limit int, query string) ([]model.User, int64, error) {
	return s.userRepo.List(page, limit, query)
}

func (s *adminService) UpdateUserTier(userID, tier string) (*model.User, error) {
	if _, ok := model.Tiers[tier]; !ok {
		return nil, utils.ErrBadRequest
	}

	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, utils.ErrNotFound
		}
		return nil, err
	}

	user.Tier = tier
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}
