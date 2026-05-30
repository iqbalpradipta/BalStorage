package services

import (
	"strings"

	"balStorage/backend/model"
	"balStorage/backend/repository"
	"balStorage/backend/utils"

	"gorm.io/gorm"
)

type AdminService interface {
	ListUsers(page, limit int, query string) ([]model.User, int64, error)
	UpdateUserTier(userID, tier string) (*model.User, error)
	GetDiscordChannelMode() (string, error)
	UpdateDiscordChannelMode(mode string) (string, error)
}

type adminService struct {
	userRepo    repository.UserRepository
	settingRepo repository.SettingRepository
}

func NewAdminService(userRepo repository.UserRepository, settingRepo repository.SettingRepository) AdminService {
	return &adminService{
		userRepo:    userRepo,
		settingRepo: settingRepo,
	}
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

func (s *adminService) GetDiscordChannelMode() (string, error) {
	if s.settingRepo == nil {
		return defaultDiscordChannelMode, nil
	}

	value, err := s.settingRepo.Get(DiscordChannelModeSettingKey)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			if err := s.settingRepo.Set(DiscordChannelModeSettingKey, defaultDiscordChannelMode); err != nil {
				return "", err
			}
			return defaultDiscordChannelMode, nil
		}
		return "", err
	}

	return normalizeDiscordChannelModeValue(value)
}

func (s *adminService) UpdateDiscordChannelMode(mode string) (string, error) {
	normalized, err := normalizeDiscordChannelModeValue(mode)
	if err != nil {
		return "", err
	}

	if s.settingRepo == nil {
		return "", utils.ErrBadRequest
	}
	if err := s.settingRepo.Set(DiscordChannelModeSettingKey, normalized); err != nil {
		return "", err
	}

	return normalized, nil
}

func normalizeDiscordChannelModeValue(mode string) (string, error) {
	mode = strings.ToLower(strings.TrimSpace(mode))
	switch mode {
	case "folder", "":
		return "folder", nil
	case "user":
		return "user", nil
	default:
		return "", utils.ErrBadRequest
	}
}
