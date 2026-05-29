package utils

import "errors"

var (
	ErrBadRequest         = errors.New("bad request")
	ErrNotFound           = errors.New("resource not found")
	ErrConflict           = errors.New("resource already exists")
	ErrForbidden          = errors.New("access forbidden")
	ErrStorageFull        = errors.New("storage limit reached, upgrade your plan")
	ErrInvalidName        = errors.New("name must be between 2 and 80 characters")
	ErrInvalidEmail       = errors.New("invalid email address")
	ErrInvalidPassword    = errors.New("password must be between 8 and 72 characters")
	ErrInvalidPhone       = errors.New("phone number is too long")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrWeakJWTSecret      = errors.New("jwt secret is not configured securely")
)
