-- Выполнить один раз в phpMyAdmin после обновления расширения до 1.1.0.
-- Удаляет записи старого универсального парсера и сохраняет только строго
-- подтвержденные завершенные раунды Spribe.

DELETE FROM game_results
WHERE source <> 'websocket'
   OR round_id IS NULL
   OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.parser')), '') <> 'spribe-sfs-console'
   OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.final')), 'false') <> 'true'
   OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.command')), '') NOT IN ('init', 'roundChartInfo');
