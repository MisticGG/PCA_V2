from flask import Flask, request, jsonify, session, render_template, redirect, url_for
import sqlite3
import bcrypt
import os
from datetime import datetime

app = Flask(__name__)
DATABASE = 'users.db'
app.secret_key = os.urandom(24)

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

@app.cli.command('initdb')
def initdb_command():
    """Initializes the database."""
    init_db()
    print('Initialized the database.')

@app.route('/register', methods=['GET', 'POST'])
def register():
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if not username or not password:
            error = 'Username and password are required.'
        elif get_db().execute(
            'SELECT id FROM users WHERE username = ?', (username,)
        ).fetchone() is not None:
            error = f'User {username} is already registered.'
        else:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            try:
                db = get_db()
                db.execute(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    (username, hashed_password),
                )
                db.commit()
                return redirect(url_for('login'))
            except sqlite3.IntegrityError:
                error = f'User {username} is already registered.'

    return render_template('register.html', error=error)

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if not username or not password:
            error = 'Username and password are required.'
        else:
            db = get_db()
            user = db.execute(
                'SELECT id, password FROM users WHERE username = ?', (username,)
            ).fetchone()

            if user is None:
                error = 'Invalid credentials.'
            else:
                hashed_password_from_db = user['password'].encode('utf-8')
                if bcrypt.checkpw(password.encode('utf-8'), hashed_password_from_db):
                    session['user_id'] = user['id']
                    return redirect(url_for('chat'))
                else:
                    error = 'Invalid credentials.'

    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))

@app.route('/chat')
def chat():
    if 'user_id' in session:
        db = get_db()
        user = db.execute('SELECT username FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        servers = db.execute('SELECT id, name FROM servers').fetchall()
        if user:
            return render_template('chat.html', username=user['username'], servers=servers)
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))

@app.route('/get_channels/<int:server_id>')
def get_channels(server_id):
    db = get_db()
    channels = db.execute('SELECT id, name FROM channels WHERE server_id = ?', (server_id,)).fetchall()
    server = db.execute('SELECT name FROM servers WHERE id = ?', (server_id,)).fetchone()

    if server:
        channels_list = [dict(row) for row in channels]
        return jsonify({'server_name': server['name'], 'channels': channels_list})
    else:
        return jsonify({'error': 'Server not found'}), 404

@app.route('/create_server', methods=['POST'])
def create_server():
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'}), 401

    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Server name is required'}), 400

    server_name = data['name']
    owner_id = session['user_id']
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute('INSERT INTO servers (name, owner_id) VALUES (?, ?)', (server_name, owner_id))
        db.commit()
        new_server_id = cursor.lastrowid
        return jsonify({'id': new_server_id, 'name': server_name})
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create_channel/<int:server_id>', methods=['POST'])
def create_channel(server_id):
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'}), 401

    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Channel name is required'}), 400

    channel_name = data['name']
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute('INSERT INTO channels (server_id, name) VALUES (?, ?)', (server_id, channel_name))
        db.commit()
        new_channel_id = cursor.lastrowid
        return jsonify({'id': new_channel_id, 'name': channel_name})
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_messages/<int:channel_id>')
def get_messages(channel_id):
    db = get_db()
    messages = db.execute('SELECT sender, content FROM messages WHERE channel_id = ?', (channel_id,)).fetchall()
    messages_list = [dict(row) for row in messages]
    return jsonify(messages_list)

@app.route('/protected')
def protected():
    if 'user_id' in session:
        db = get_db()
        user = db.execute('SELECT username FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        if user:
            return jsonify({'message': f'Hello, {user["username"]}! This is a protected resource.'}), 200
        else:
            return jsonify({'message': 'User not found'}), 404
    else:
        return jsonify({'message': 'You are not logged in'}), 401

@app.route('/send_message', methods=['POST'])
def send_message():
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'}), 401

    data = request.get_json()
    if not data or not data.get('channel_id') or not data.get('content'):
        return jsonify({'error': 'Channel ID and message content are required'}), 400

    channel_id = data['channel_id']
    content = data['content']
    user_id = session['user_id']

    db = get_db()
    user = db.execute('SELECT username FROM users WHERE id = ?', (user_id,)).fetchone()

    if user:
        sender = user['username']
        try:
            db.execute('INSERT INTO messages (channel_id, sender, content) VALUES (?, ?, ?)', (channel_id, sender, content))
            db.commit()
            return jsonify({'status': 'success'}), 200
        except sqlite3.Error as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'User not found'}), 404

@app.route('/delete_server/<int:server_id>', methods=['DELETE'])
def delete_server(server_id):
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'}), 401

    db = get_db()
    server = db.execute('SELECT owner_id FROM servers WHERE id = ?', (server_id,)).fetchone()

    if not server:
        return jsonify({'error': 'Server not found'}), 404

    if server['owner_id'] != session['user_id']:
        return jsonify({'error': 'You do not own this server'}), 403

    try:
        db.execute('DELETE FROM messages WHERE channel_id IN (SELECT id FROM channels WHERE server_id = ?)', (server_id,))
        db.execute('DELETE FROM channels WHERE server_id = ?', (server_id,))
        db.execute('DELETE FROM servers WHERE id = ?', (server_id,))
        db.commit()
        return jsonify({'success': True}), 200
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/delete_channel/<int:server_id>/<int:channel_id>', methods=['DELETE'])
def delete_channel(server_id, channel_id):
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'}), 401

    db = get_db()
    channel = db.execute('SELECT server_id FROM channels WHERE id = ?', (channel_id,)).fetchone()
    server = db.execute('SELECT owner_id FROM servers WHERE id = ?', (server_id,)).fetchone()

    if not channel:
        return jsonify({'error': 'Channel not found'}), 404

    if not server:
        return jsonify({'error': 'Server not found'}), 404

    if channel['server_id'] != server_id:
        return jsonify({'error': 'Channel does not belong to this server'}), 400

    # Basic check: Only the server owner can delete channels for now
    if server['owner_id'] != session['user_id']:
        return jsonify({'error': 'Only the server owner can delete channels'}), 403

    try:
        db.execute('DELETE FROM messages WHERE channel_id = ?', (channel_id,))
        db.execute('DELETE FROM channels WHERE id = ?', (channel_id,))
        db.commit()
        return jsonify({'success': True}), 200
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/delete_message/<int:channel_id>', methods=['DELETE'])
def delete_message(channel_id):
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'}), 401

    data = request.get_json()
    if not data or not data.get('content'): # Using content as identifier for simplicity
        return jsonify({'error': 'Message content to delete is required'}), 400

    message_content = data['content']
    user_id = session['user_id']

    db = get_db()
    message = db.execute('SELECT sender FROM messages WHERE channel_id = ? AND content = ?', (channel_id, message_content)).fetchone()

    if not message:
        return jsonify({'error': 'Message not found in this channel'}), 404

    # Basic check: Only the sender can delete their own messages for now
    user = db.execute('SELECT username FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user or message['sender'] != user['username']:
        return jsonify({'error': 'You cannot delete this message'}), 403

    try:
        db.execute('DELETE FROM messages WHERE channel_id = ? AND content = ? AND sender = ?', (channel_id, message_content, user['username']))
        db.commit()
        return jsonify({'success': True}), 200
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True)