// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/**
 * @title VocabChain
 * @author VocabChain Team
 * @notice Smart contract for tracking vocabulary learning progress on blockchain
 * @dev Implements modern Solidity patterns with events, custom errors, and efficient storage
 */
contract VocabChain {
    // =============================================================
    //                          CONSTANTS
    // =============================================================

    uint256 public constant MAX_LEVEL = 100;
    uint256 public constant WORDS_PER_LEVEL = 50;
    uint256 public constant STREAK_MULTIPLIER = 2;
    uint256 public constant PERFECT_SCORE_BONUS = 10;

    // =============================================================
    //                       CUSTOM ERRORS
    // =============================================================

    error VocabChain__UserNotRegistered();
    error VocabChain__InvalidLevel(uint256 provided, uint256 max);
    error VocabChain__InvalidScore(uint256 provided, uint256 max);
    error VocabChain__AlreadyRegistered();
    error VocabChain__UnauthorizedAccess();
    error VocabChain__InvalidDifficulty();
    error VocabChain__SessionAlreadyStarted();
    error VocabChain__NoActiveSession();
    error VocabChain__InvalidWordCount();

    // =============================================================
    //                           ENUMS
    // =============================================================

    enum Difficulty {
        BEGINNER, // 0
        ELEMENTARY, // 1
        INTERMEDIATE, // 2
        ADVANCED, // 3
        EXPERT // 4
    }

    enum AchievementType {
        FIRST_WORD,
        STREAK_7,
        STREAK_30,
        PERFECT_SESSION,
        LEVEL_UP,
        VOCABULARY_MASTER
    }

    // =============================================================
    //                          STRUCTS
    // =============================================================

    struct UserProfile {
        bool isRegistered;
        string username;
        uint256 currentLevel;
        uint256 totalWordsLearned;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 totalSessions;
        uint256 totalCorrectAnswers;
        uint256 totalIncorrectAnswers;
        Difficulty currentDifficulty;
        uint256 registrationTimestamp;
        uint256 lastActiveTimestamp;
    }

    struct StudySession {
        uint256 sessionId;
        address user;
        uint256 startTimestamp;
        uint256 endTimestamp;
        uint256 wordsStudied;
        uint256 correctAnswers;
        uint256 incorrectAnswers;
        Difficulty difficulty;
        bool isCompleted;
        uint256 scoreEarned;
    }

    struct Achievement {
        AchievementType achievementType;
        uint256 timestamp;
        string description;
        uint256 pointsAwarded;
    }

    struct WordProgress {
        uint256 timesStudied;
        uint256 correctAttempts;
        uint256 incorrectAttempts;
        uint256 lastStudiedTimestamp;
        bool isMastered;
    }

    // =============================================================
    //                         STORAGE
    // =============================================================

    mapping(address => UserProfile) private s_userProfiles;
    mapping(address => StudySession) private s_activeSessions;
    mapping(address => Achievement[]) private s_userAchievements;
    mapping(address => mapping(string => WordProgress)) private s_wordProgress;
    mapping(uint256 => StudySession) private s_completedSessions;

    address[] private s_registeredUsers;
    uint256 private s_nextSessionId = 1;
    uint256 private s_totalSessionsCompleted;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event UserRegistered(
        address indexed user,
        string username,
        Difficulty difficulty,
        uint256 timestamp
    );

    event SessionStarted(
        address indexed user,
        uint256 indexed sessionId,
        Difficulty difficulty,
        uint256 timestamp
    );

    event SessionCompleted(
        address indexed user,
        uint256 indexed sessionId,
        uint256 wordsStudied,
        uint256 correctAnswers,
        uint256 scoreEarned,
        uint256 timestamp
    );

    event WordStudied(
        address indexed user,
        string indexed wordHash,
        bool correct,
        uint256 timestamp
    );

    event LevelUp(
        address indexed user,
        uint256 previousLevel,
        uint256 newLevel,
        uint256 timestamp
    );

    event AchievementUnlocked(
        address indexed user,
        AchievementType indexed achievementType,
        string description,
        uint256 pointsAwarded,
        uint256 timestamp
    );

    event StreakUpdated(
        address indexed user,
        uint256 newStreak,
        bool isNewRecord,
        uint256 timestamp
    );

    event DifficultyChanged(
        address indexed user,
        Difficulty previousDifficulty,
        Difficulty newDifficulty,
        uint256 timestamp
    );

    // =============================================================
    //                        MODIFIERS
    // =============================================================

    modifier onlyRegistered() {
        if (!s_userProfiles[msg.sender].isRegistered) {
            revert VocabChain__UserNotRegistered();
        }
        _;
    }

    modifier validDifficulty(Difficulty _difficulty) {
        if (uint8(_difficulty) > uint8(Difficulty.EXPERT)) {
            revert VocabChain__InvalidDifficulty();
        }
        _;
    }

    // =============================================================
    //                    USER MANAGEMENT
    // =============================================================

    /**
     * @notice Register a new user in the VocabChain system
     * @param _username Unique username for the user
     * @param _difficulty Starting difficulty level
     */
    function registerUser(
        string calldata _username,
        Difficulty _difficulty
    ) external validDifficulty(_difficulty) {
        if (s_userProfiles[msg.sender].isRegistered) {
            revert VocabChain__AlreadyRegistered();
        }

        s_userProfiles[msg.sender] = UserProfile({
            isRegistered: true,
            username: _username,
            currentLevel: 1,
            totalWordsLearned: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalSessions: 0,
            totalCorrectAnswers: 0,
            totalIncorrectAnswers: 0,
            currentDifficulty: _difficulty,
            registrationTimestamp: block.timestamp,
            lastActiveTimestamp: block.timestamp
        });

        s_registeredUsers.push(msg.sender);

        // Award first achievement
        _unlockAchievement(
            msg.sender,
            AchievementType.FIRST_WORD,
            "Welcome to VocabChain!",
            10
        );

        emit UserRegistered(
            msg.sender,
            _username,
            _difficulty,
            block.timestamp
        );
    }

    // =============================================================
    //                    SESSION MANAGEMENT
    // =============================================================

    /**
     * @notice Start a new study session
     * @param _difficulty Difficulty level for this session
     */
    function startSession(
        Difficulty _difficulty
    ) external onlyRegistered validDifficulty(_difficulty) {
        if (s_activeSessions[msg.sender].sessionId != 0) {
            revert VocabChain__SessionAlreadyStarted();
        }

        uint256 sessionId = s_nextSessionId++;

        s_activeSessions[msg.sender] = StudySession({
            sessionId: sessionId,
            user: msg.sender,
            startTimestamp: block.timestamp,
            endTimestamp: 0,
            wordsStudied: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            difficulty: _difficulty,
            isCompleted: false,
            scoreEarned: 0
        });

        // Update user's last active timestamp
        s_userProfiles[msg.sender].lastActiveTimestamp = block.timestamp;

        emit SessionStarted(
            msg.sender,
            sessionId,
            _difficulty,
            block.timestamp
        );
    }

    /**
     * @notice Record a word study attempt during active session
     * @param _wordHash Keccak256 hash of the word studied
     * @param _correct Whether the answer was correct
     */
    function recordWordStudy(
        string calldata _wordHash,
        bool _correct
    ) external onlyRegistered {
        StudySession storage session = s_activeSessions[msg.sender];
        if (session.sessionId == 0) {
            revert VocabChain__NoActiveSession();
        }

        // Update session stats
        session.wordsStudied++;
        if (_correct) {
            session.correctAnswers++;
        } else {
            session.incorrectAnswers++;
        }

        // Update word progress
        WordProgress storage wordProgress = s_wordProgress[msg.sender][
            _wordHash
        ];
        wordProgress.timesStudied++;
        wordProgress.lastStudiedTimestamp = block.timestamp;

        if (_correct) {
            wordProgress.correctAttempts++;
            // Mark as mastered if answered correctly 3 times
            if (
                wordProgress.correctAttempts >= 3 &&
                wordProgress.correctAttempts > wordProgress.incorrectAttempts
            ) {
                wordProgress.isMastered = true;
            }
        } else {
            wordProgress.incorrectAttempts++;
            wordProgress.isMastered = false; // Reset mastery on incorrect answer
        }

        emit WordStudied(msg.sender, _wordHash, _correct, block.timestamp);
    }

    /**
     * @notice Complete the current study session
     */
    function completeSession() external onlyRegistered {
        StudySession storage session = s_activeSessions[msg.sender];
        if (session.sessionId == 0) {
            revert VocabChain__NoActiveSession();
        }

        if (session.wordsStudied == 0) {
            revert VocabChain__InvalidWordCount();
        }

        // Calculate score
        uint256 baseScore = session.correctAnswers * 10;
        uint256 accuracyBonus = 0;

        if (session.wordsStudied > 0) {
            uint256 accuracy = (session.correctAnswers * 100) /
                session.wordsStudied;
            if (accuracy == 100) {
                accuracyBonus = PERFECT_SCORE_BONUS;
                _unlockAchievement(
                    msg.sender,
                    AchievementType.PERFECT_SESSION,
                    "Perfect Session!",
                    50
                );
            }
        }

        uint256 streakBonus = s_userProfiles[msg.sender].currentStreak *
            STREAK_MULTIPLIER;
        session.scoreEarned = baseScore + accuracyBonus + streakBonus;

        // Mark session as completed
        session.endTimestamp = block.timestamp;
        session.isCompleted = true;

        // Update user profile
        UserProfile storage user = s_userProfiles[msg.sender];
        user.totalWordsLearned += session.wordsStudied;
        user.totalCorrectAnswers += session.correctAnswers;
        user.totalIncorrectAnswers += session.incorrectAnswers;
        user.totalSessions++;
        user.lastActiveTimestamp = block.timestamp;

        // Update streak
        _updateStreak(msg.sender, session.correctAnswers > 0);

        // Check for level up
        _checkLevelUp(msg.sender);

        // Store completed session
        s_completedSessions[session.sessionId] = session;
        s_totalSessionsCompleted++;

        emit SessionCompleted(
            msg.sender,
            session.sessionId,
            session.wordsStudied,
            session.correctAnswers,
            session.scoreEarned,
            block.timestamp
        );

        // Clear active session
        delete s_activeSessions[msg.sender];
    }

    // =============================================================
    //                    INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Update user's streak based on session performance
     */
    function _updateStreak(address _user, bool _hasCorrectAnswers) internal {
        UserProfile storage user = s_userProfiles[_user];
        bool isNewRecord = false;

        if (_hasCorrectAnswers) {
            user.currentStreak++;
            if (user.currentStreak > user.longestStreak) {
                user.longestStreak = user.currentStreak;
                isNewRecord = true;
            }

            // Check for streak achievements
            if (user.currentStreak == 7) {
                _unlockAchievement(
                    _user,
                    AchievementType.STREAK_7,
                    "7 Day Streak!",
                    100
                );
            } else if (user.currentStreak == 30) {
                _unlockAchievement(
                    _user,
                    AchievementType.STREAK_30,
                    "30 Day Streak Master!",
                    500
                );
            }
        } else {
            user.currentStreak = 0;
        }

        emit StreakUpdated(
            _user,
            user.currentStreak,
            isNewRecord,
            block.timestamp
        );
    }

    /**
     * @dev Check if user should level up based on words learned
     */
    function _checkLevelUp(address _user) internal {
        UserProfile storage user = s_userProfiles[_user];
        uint256 expectedLevel = (user.totalWordsLearned / WORDS_PER_LEVEL) + 1;

        if (expectedLevel > user.currentLevel && expectedLevel <= MAX_LEVEL) {
            uint256 previousLevel = user.currentLevel;
            user.currentLevel = expectedLevel;

            _unlockAchievement(
                _user,
                AchievementType.LEVEL_UP,
                string(
                    abi.encodePacked(
                        "Reached Level ",
                        _toString(expectedLevel),
                        "!"
                    )
                ),
                expectedLevel * 25
            );

            // Check for vocabulary master achievement
            if (expectedLevel >= MAX_LEVEL) {
                _unlockAchievement(
                    _user,
                    AchievementType.VOCABULARY_MASTER,
                    "Vocabulary Master - Maximum Level Reached!",
                    1000
                );
            }

            emit LevelUp(_user, previousLevel, expectedLevel, block.timestamp);
        }
    }

    /**
     * @dev Unlock achievement for user
     */
    function _unlockAchievement(
        address _user,
        AchievementType _type,
        string memory _description,
        uint256 _points
    ) internal {
        Achievement memory newAchievement = Achievement({
            achievementType: _type,
            timestamp: block.timestamp,
            description: _description,
            pointsAwarded: _points
        });

        s_userAchievements[_user].push(newAchievement);

        emit AchievementUnlocked(
            _user,
            _type,
            _description,
            _points,
            block.timestamp
        );
    }

    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get user profile information
     * @param _user Address of the user
     * @return UserProfile struct
     */
    function getUserProfile(
        address _user
    ) external view returns (UserProfile memory) {
        return s_userProfiles[_user];
    }

    /**
     * @notice Get user's active session
     * @param _user Address of the user
     * @return StudySession struct
     */
    function getActiveSession(
        address _user
    ) external view returns (StudySession memory) {
        return s_activeSessions[_user];
    }

    /**
     * @notice Get user's achievements
     * @param _user Address of the user
     * @return Array of Achievement structs
     */
    function getUserAchievements(
        address _user
    ) external view returns (Achievement[] memory) {
        return s_userAchievements[_user];
    }

    /**
     * @notice Get word progress for specific user and word
     * @param _user Address of the user
     * @param _wordHash Hash of the word
     * @return WordProgress struct
     */
    function getWordProgress(
        address _user,
        string calldata _wordHash
    ) external view returns (WordProgress memory) {
        return s_wordProgress[_user][_wordHash];
    }

    /**
     * @notice Get completed session by ID
     * @param _sessionId ID of the session
     * @return StudySession struct
     */
    function getCompletedSession(
        uint256 _sessionId
    ) external view returns (StudySession memory) {
        return s_completedSessions[_sessionId];
    }

    /**
     * @notice Get total number of registered users
     * @return Number of registered users
     */
    function getTotalUsers() external view returns (uint256) {
        return s_registeredUsers.length;
    }

    /**
     * @notice Get total number of completed sessions
     * @return Number of completed sessions
     */
    function getTotalCompletedSessions() external view returns (uint256) {
        return s_totalSessionsCompleted;
    }

    /**
     * @notice Check if user is registered
     * @param _user Address to check
     * @return Boolean indicating registration status
     */
    function isUserRegistered(address _user) external view returns (bool) {
        return s_userProfiles[_user].isRegistered;
    }
}
