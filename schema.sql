-- Initialize the database.
-- Drop any existing tables and recreate them.

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS servers;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS messages;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (server_id) REFERENCES servers(id)
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);