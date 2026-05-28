package repository

import (
	"balStorage/backend/model"

	"gorm.io/gorm"
)

type FolderRepository interface {
	FindByID(id string) (*model.Folder, error)
	FindByUserID(userID string) ([]model.Folder, error)
	FindByUserIDAndParentID(userID string, parentID *string) ([]model.Folder, error)
	FindByNameAndUserID(name, userID string) (*model.Folder, error)
	Create(folder *model.Folder) error
	Update(folder *model.Folder) error
	Delete(id string) error
	DeleteByParentID(parentID string) error
}

type folderRepository struct {
	db *gorm.DB
}

func NewFolderRepository(db *gorm.DB) FolderRepository {
	return &folderRepository{db: db}
}

func (r *folderRepository) FindByID(id string) (*model.Folder, error) {
	var folder model.Folder
	err := r.db.First(&folder, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &folder, nil
}

func (r *folderRepository) FindByUserID(userID string) ([]model.Folder, error) {
	var folders []model.Folder
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&folders).Error
	return folders, err
}

func (r *folderRepository) FindByUserIDAndParentID(userID string, parentID *string) ([]model.Folder, error) {
	var folders []model.Folder
	q := r.db
	if userID != "" {
		q = q.Where("user_id = ?", userID)
	}
	if parentID == nil {
		q = q.Where("parent_id IS NULL")
	} else {
		q = q.Where("parent_id = ?", *parentID)
	}
	err := q.Order("created_at DESC").Find(&folders).Error
	return folders, err
}

func (r *folderRepository) FindByNameAndUserID(name, userID string) (*model.Folder, error) {
	var folder model.Folder
	err := r.db.Where("name = ? AND user_id = ?", name, userID).First(&folder).Error
	if err != nil {
		return nil, err
	}
	return &folder, nil
}

func (r *folderRepository) Create(folder *model.Folder) error {
	return r.db.Create(folder).Error
}

func (r *folderRepository) Update(folder *model.Folder) error {
	return r.db.Save(folder).Error
}

func (r *folderRepository) Delete(id string) error {
	return r.db.Delete(&model.Folder{}, "id = ?", id).Error
}

func (r *folderRepository) DeleteByParentID(parentID string) error {
	return r.db.Delete(&model.Folder{}, "parent_id = ?", parentID).Error
}
