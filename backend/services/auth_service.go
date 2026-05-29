package services

import (
	"errors"
	"strings"
	"time"

	"balStorage/backend/model"
	"balStorage/backend/repository"
	"balStorage/backend/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService interface {
	Register(input model.RegisterInput) (*model.User, error)
	Login(input model.LoginInput) (*model.User, string, error)
	GetProfile(userID string) (*model.User, error)
}

type authService struct {
	userRepo repository.UserRepository
}

func NewAuthService(userRepo repository.UserRepository) AuthService {
	return &authService{userRepo: userRepo}
}

func (s *authService) Register(input model.RegisterInput) (*model.User, error) {
	if _, err := s.userRepo.FindByEmail(input.Email); err == nil {
		return nil, utils.ErrConflict
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: string(hashedPassword),
		Phone:    input.Phone,
		Role:     "user",
	}

	if err := s.userRepo.Create(user); err != nil {
		if isUniqueViolation(err) {
			return nil, utils.ErrConflict
		}
		return nil, err
	}

	return user, nil
}

func (s *authService) Login(input model.LoginInput) (*model.User, string, error) {
	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		return nil, "", utils.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return nil, "", utils.ErrInvalidCredentials
	}

	token, err := s.generateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

func (s *authService) GetProfile(userID string) (*model.User, error) {
	return s.userRepo.FindByID(userID)
}

func (s *authService) generateToken(userID, email, role string) (string, error) {
	secret := utils.GetEnv("JWT_SECRET", "")
	if len(strings.TrimSpace(secret)) < 32 {
		return "", utils.ErrWeakJWTSecret
	}

	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"role":  role,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(72 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
