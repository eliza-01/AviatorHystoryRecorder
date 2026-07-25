CREATE TABLE IF NOT EXISTS game_results (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id CHAR(36) NOT NULL,
    dedupe_key CHAR(64) NOT NULL,
    game_key VARCHAR(64) NOT NULL,
    round_id VARCHAR(128) NULL,
    multiplier DECIMAL(12, 2) NOT NULL,
    happened_at DATETIME(3) NULL,
    captured_at DATETIME(3) NOT NULL,
    source VARCHAR(32) NOT NULL,
    page_url TEXT NULL,
    frame_url TEXT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    metadata JSON NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_game_results_event_id (event_id),
    UNIQUE KEY uq_game_results_dedupe_key (dedupe_key),
    KEY idx_game_results_game_captured (game_key, captured_at),
    KEY idx_game_results_round (round_id),
    KEY idx_game_results_multiplier (multiplier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diagnostic_samples (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id CHAR(36) NOT NULL,
    game_key VARCHAR(64) NOT NULL,
    transport VARCHAR(32) NOT NULL,
    direction VARCHAR(16) NOT NULL,
    frame_url TEXT NULL,
    endpoint_url TEXT NULL,
    payload_sample TEXT NOT NULL,
    captured_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_diagnostic_samples_event_id (event_id),
    KEY idx_diagnostic_samples_captured (captured_at),
    KEY idx_diagnostic_samples_transport (transport)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
