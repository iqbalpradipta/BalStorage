package repository

import (
	"balStorage/backend/model"

	"gorm.io/gorm"
)

type SettingRepository interface {
	Get(key string) (string, error)
	Set(key, value string) error
}

type settingRepository struct {
	db *gorm.DB
}

func NewSettingRepository(db *gorm.DB) SettingRepository {
	return &settingRepository{db: db}
}

func (r *settingRepository) Get(key string) (string, error) {
	var setting model.AppSetting
	if err := r.db.First(&setting, "key = ?", key).Error; err != nil {
		return "", err
	}
	return setting.Value, nil
}

func (r *settingRepository) Set(key, value string) error {
	setting := model.AppSetting{
		Key:   key,
		Value: value,
	}

	return r.db.Save(&setting).Error
}
