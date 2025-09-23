package repositories

import (
	"context"
	"explorer-api/internal/domain/entities"
)

// UserRepository define as operações de banco de dados para usuários
type UserRepository interface {
	// Operações básicas de usuário
	Create(ctx context.Context, user *entities.User) error
	GetByID(ctx context.Context, id int) (*entities.User, error)
	GetByUsername(ctx context.Context, username string) (*entities.User, error)
	GetByEmail(ctx context.Context, email string) (*entities.User, error)
	Update(ctx context.Context, user *entities.User) error
	Delete(ctx context.Context, id int) error
	List(ctx context.Context, limit, offset int) ([]*entities.User, error)
	Count(ctx context.Context) (int, error)

	// Operações de sessão
	CreateSession(ctx context.Context, session *entities.UserSession) error
	GetSessionByToken(ctx context.Context, token string) (*entities.UserSession, error)
	DeleteSession(ctx context.Context, token string) error
	DeleteUserSessions(ctx context.Context, userID int) error
	CleanExpiredSessions(ctx context.Context) error

	// Operações de autenticação
	UpdateLastLogin(ctx context.Context, userID int) error
	UpdatePassword(ctx context.Context, userID int, passwordHash string) error
}
