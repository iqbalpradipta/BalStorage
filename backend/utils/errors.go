package utils

import "errors"

var (
	ErrBadRequest = errors.New("bad request")
	ErrNotFound   = errors.New("resource not found")
	ErrConflict   = errors.New("resource already exists")
	ErrForbidden   = errors.New("access forbidden")
	ErrStorageFull = errors.New("storage limit reached, upgrade your plan")
)
