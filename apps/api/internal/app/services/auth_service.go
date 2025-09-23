package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

type AuthService struct {
	userRepo repositories.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo repositories.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

// Login autentica um usuário e retorna um token JWT
func (s *AuthService) Login(ctx context.Context, req *entities.LoginRequest) (*entities.LoginResponse, error) {
	// Buscar usuário por username
	user, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err != nil {
		return nil, errors.New("credenciais inválidas")
	}

	// Verificar se o usuário está ativo
	if !user.IsActive {
		return nil, errors.New("usuário inativo")
	}

	// Verificar senha
	if !s.checkPassword(req.Password, user.PasswordHash) {
		return nil, errors.New("credenciais inválidas")
	}

	// Gerar token JWT
	token, expiresAt, err := s.generateJWT(user)
	if err != nil {
		return nil, fmt.Errorf("erro ao gerar token: %w", err)
	}

	// Criar sessão no banco
	session := &entities.UserSession{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: expiresAt,
		IsActive:  true,
	}

	if err := s.userRepo.CreateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("erro ao criar sessão: %w", err)
	}

	// Atualizar último login
	if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
		// Log do erro mas não falha o login
		fmt.Printf("Erro ao atualizar último login: %v\n", err)
	}

	// Remover senha da resposta
	user.PasswordHash = ""

	return &entities.LoginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      *user,
	}, nil
}

// Register cria um novo usuário
func (s *AuthService) Register(ctx context.Context, req *entities.RegisterRequest) (*entities.User, error) {
	// Verificar se username já existe
	existingUser, _ := s.userRepo.GetByUsername(ctx, req.Username)
	if existingUser != nil {
		return nil, errors.New("username já existe")
	}

	// Verificar se email já existe
	existingEmail, _ := s.userRepo.GetByEmail(ctx, req.Email)
	if existingEmail != nil {
		return nil, errors.New("email já existe")
	}

	// Hash da senha
	passwordHash, err := s.hashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("erro ao processar senha: %w", err)
	}

	// Criar usuário
	user := &entities.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: passwordHash,
		IsActive:     true,
		IsAdmin:      false, // Por padrão, usuários não são admin
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("erro ao criar usuário: %w", err)
	}

	// Remover senha da resposta
	user.PasswordHash = ""

	return user, nil
}

// Logout invalida o token
func (s *AuthService) Logout(ctx context.Context, token string) error {
	return s.userRepo.DeleteSession(ctx, token)
}

// ValidateToken valida um token JWT e retorna o usuário
func (s *AuthService) ValidateToken(ctx context.Context, token string) (*entities.User, error) {
	// Verificar se a sessão existe e está ativa
	session, err := s.userRepo.GetSessionByToken(ctx, token)
	if err != nil {
		return nil, errors.New("sessão inválida")
	}

	// Buscar usuário
	user, err := s.userRepo.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, errors.New("usuário não encontrado")
	}

	// Verificar se usuário está ativo
	if !user.IsActive {
		return nil, errors.New("usuário inativo")
	}

	// Remover senha da resposta
	user.PasswordHash = ""

	return user, nil
}

// ChangePassword altera a senha do usuário
func (s *AuthService) ChangePassword(ctx context.Context, userID int, req *entities.ChangePasswordRequest) error {
	// Buscar usuário
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("usuário não encontrado")
	}

	// Verificar senha atual
	if !s.checkPassword(req.CurrentPassword, user.PasswordHash) {
		return errors.New("senha atual incorreta")
	}

	// Hash da nova senha
	newPasswordHash, err := s.hashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("erro ao processar nova senha: %w", err)
	}

	// Atualizar senha
	if err := s.userRepo.UpdatePassword(ctx, userID, newPasswordHash); err != nil {
		return fmt.Errorf("erro ao atualizar senha: %w", err)
	}

	// Invalidar todas as sessões do usuário
	if err := s.userRepo.DeleteUserSessions(ctx, userID); err != nil {
		// Log do erro mas não falha a operação
		fmt.Printf("Erro ao invalidar sessões: %v\n", err)
	}

	return nil
}

// CleanExpiredSessions remove sessões expiradas
func (s *AuthService) CleanExpiredSessions(ctx context.Context) error {
	return s.userRepo.CleanExpiredSessions(ctx)
}

// hashPassword gera hash da senha usando bcrypt
func (s *AuthService) hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// checkPassword verifica se a senha está correta
func (s *AuthService) checkPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// generateJWT gera um token JWT
func (s *AuthService) generateJWT(user *entities.User) (string, time.Time, error) {
	// Token expira em 24 horas
	expiresAt := time.Now().Add(24 * time.Hour)

	// Claims do JWT
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"is_admin": user.IsAdmin,
		"exp":      expiresAt.Unix(),
		"iat":      time.Now().Unix(),
	}

	// Criar token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

// generateRandomString gera uma string aleatória para tokens
func (s *AuthService) generateRandomString(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// hashString gera hash SHA256 de uma string
func (s *AuthService) hashString(input string) string {
	hash := sha256.Sum256([]byte(input))
	return hex.EncodeToString(hash[:])
}
