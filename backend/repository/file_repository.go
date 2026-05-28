package repository

import (
	"balStorage/backend/model"

	"gorm.io/gorm"
)

type FileRepository interface {
	FindByID(id string) (*model.File, error)
	FindByFolderID(folderID string, page, limit int) ([]model.File, int64, error)
	FindByUserID(userID string, page, limit int) ([]model.File, int64, error)
	Create(file *model.File) error
	Delete(id string) error
	CountByFolderID(folderID string) (int64, error)
}

type fileRepository struct {
	db *gorm.DB
}

func NewFileRepository(db *gorm.DB) FileRepository {
	return &fileRepository{db: db}
}

func (r *fileRepository) FindByID(id string) (*model.File, error) {
	var file model.File
	err := r.db.First(&file, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

func (r *fileRepository) FindByFolderID(folderID string, page, limit int) ([]model.File, int64, error) {
	var files []model.File
	var total int64

	q := r.db.Model(&model.File{}).Where("folder_id = ?", folderID)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := q.Offset(offset).Limit(limit).Order("created_at DESC").Find(&files).Error
	return files, total, err
}

func (r *fileRepository) FindByUserID(userID string, page, limit int) ([]model.File, int64, error) {
	var files []model.File
	var total int64

	q := r.db.Model(&model.File{}).Where("user_id = ?", userID)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := q.Offset(offset).Limit(limit).Order("created_at DESC").Find(&files).Error
	return files, total, err
}

func (r *fileRepository) Create(file *model.File) error {
	return r.db.Create(file).Error
}

func (r *fileRepository) Delete(id string) error {
	return r.db.Delete(&model.File{}, "id = ?", id).Error
}

func (r *fileRepository) CountByFolderID(folderID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.File{}).Where("folder_id = ?", folderID).Count(&count).Error
	return count, err
}
