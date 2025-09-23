package database

import (
	"context"
	"database/sql"
	"time"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

type PostgresUserRepository struct {
	db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) repositories.UserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) Create(ctx context.Context, user *entities.User) error {
	query := `
		INSERT INTO users (username, email, password_hash, is_active, is_admin, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`

	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	return r.db.QueryRowContext(ctx, query,
		user.Username, user.Email, user.PasswordHash, user.IsActive, user.IsAdmin, user.CreatedAt, user.UpdatedAt,
	).Scan(&user.ID)
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id int) (*entities.User, error) {
	query := `
		SELECT id, username, email, password_hash, is_active, is_admin, last_login, created_at, updated_at
		FROM users WHERE id = $1`

	user := &entities.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.IsActive, &user.IsAdmin, &user.LastLogin, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *PostgresUserRepository) GetByUsername(ctx context.Context, username string) (*entities.User, error) {
	query := `
		SELECT id, username, email, password_hash, is_active, is_admin, last_login, created_at, updated_at
		FROM users WHERE username = $1`

	user := &entities.User{}
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.IsActive, &user.IsAdmin, &user.LastLogin, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*entities.User, error) {
	query := `
		SELECT id, username, email, password_hash, is_active, is_admin, last_login, created_at, updated_at
		FROM users WHERE email = $1`

	user := &entities.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.IsActive, &user.IsAdmin, &user.LastLogin, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *PostgresUserRepository) Update(ctx context.Context, user *entities.User) error {
	query := `
		UPDATE users
		SET username = $2, email = $3, is_active = $4, is_admin = $5, updated_at = $6
		WHERE id = $1`

	user.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, query,
		user.ID, user.Username, user.Email, user.IsActive, user.IsAdmin, user.UpdatedAt,
	)

	return err
}

func (r *PostgresUserRepository) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *PostgresUserRepository) List(ctx context.Context, limit, offset int) ([]*entities.User, error) {
	query := `
		SELECT id, username, email, password_hash, is_active, is_admin, last_login, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*entities.User
	for rows.Next() {
		user := &entities.User{}
		err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.PasswordHash,
			&user.IsActive, &user.IsAdmin, &user.LastLogin, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

func (r *PostgresUserRepository) Count(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM users`
	var count int
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}

func (r *PostgresUserRepository) CreateSession(ctx context.Context, session *entities.UserSession) error {
	query := `
		INSERT INTO user_sessions (user_id, token, expires_at, created_at, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	session.CreatedAt = time.Now()
	return r.db.QueryRowContext(ctx, query,
		session.UserID, session.Token, session.ExpiresAt, session.CreatedAt, session.IsActive,
	).Scan(&session.ID)
}

func (r *PostgresUserRepository) GetSessionByToken(ctx context.Context, token string) (*entities.UserSession, error) {
	query := `
		SELECT id, user_id, token, expires_at, created_at, is_active
		FROM user_sessions
		WHERE token = $1 AND is_active = true AND expires_at > NOW()`

	session := &entities.UserSession{}
	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&session.ID, &session.UserID, &session.Token, &session.ExpiresAt, &session.CreatedAt, &session.IsActive,
	)

	if err != nil {
		return nil, err
	}

	return session, nil
}

func (r *PostgresUserRepository) DeleteSession(ctx context.Context, token string) error {
	query := `UPDATE user_sessions SET is_active = false WHERE token = $1`
	_, err := r.db.ExecContext(ctx, query, token)
	return err
}

func (r *PostgresUserRepository) DeleteUserSessions(ctx context.Context, userID int) error {
	query := `UPDATE user_sessions SET is_active = false WHERE user_id = $1`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *PostgresUserRepository) CleanExpiredSessions(ctx context.Context) error {
	query := `UPDATE user_sessions SET is_active = false WHERE expires_at < NOW()`
	_, err := r.db.ExecContext(ctx, query)
	return err
}

func (r *PostgresUserRepository) UpdateLastLogin(ctx context.Context, userID int) error {
	query := `UPDATE users SET last_login = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *PostgresUserRepository) UpdatePassword(ctx context.Context, userID int, passwordHash string) error {
	query := `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, userID, passwordHash)
	return err
}
