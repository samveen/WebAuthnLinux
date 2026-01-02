#!/usr/bin/env python3

import sys
import json
import struct
import os
import subprocess
import hashlib
import base64

# Configuration
CONFIG_DIR = os.path.expanduser("~/.config/webauthnlinux")
KEY_FILE = os.path.join(CONFIG_DIR, "master.key")

def get_message():
    """Read a message from stdin (length-prefixed JSON)."""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None
    message_length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message_content):
    """Send a message to stdout (length-prefixed JSON)."""
    encoded_content = json.dumps(message_content).encode('utf-8')
    encoded_length = struct.pack('@I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

def ensure_master_key():
    """Ensure the master key exists securely."""
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR, mode=0o700)
    
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "rb") as f:
            return f.read().hex()
    else:
        # Generate new random key
        key = os.urandom(32)
        with open(KEY_FILE, "wb") as f:
            f.write(key)
        os.chmod(KEY_FILE, 0o600)
        return key.hex()

def verify_fingerprint():
    """Invoke fprintd-verify to check user identity."""
    try:
        # We use 'fprintd-verify' which interactively asks for a swipe.
        # Ideally, we should check for specific user output.
        # For simplicity, we assume exit code 0 is success.
        
        # NOTE: fprintd-verify usually writes to stdout/stderr.
        # Since we are communicating over stdin/stdout with the browser,
        # we MUST capture or redirect subprocess IO to avoid corrupting the stream.
        result = subprocess.run(
            ['fprintd-verify'], 
            capture_output=True, 
            text=True
        )
        
        # Check for success string usually present in fprintd output
        if result.returncode == 0 and ("verify-match" in result.stdout or "verify-match" in result.stderr):
            return True, "Verified"
        else:
            return False, f"Failed: {result.stderr or result.stdout}"
            
    except FileNotFoundError:
        return False, "fprintd-verify not found. Install fprintd?"
    except Exception as e:
        return False, str(e)

def main():
    while True:
        try:
            message = get_message()
            if not message:
                break
            
            msg_type = message.get('type')
            
            if msg_type == 'unlock':
                # Trigger Fingerprint
                success, reason = verify_fingerprint()
                
                if success:
                    key = ensure_master_key()
                    send_message({"status": "success", "key": key})
                else:
                    send_message({"status": "error", "message": reason})
                    
            elif msg_type == 'ping':
                send_message({"status": "pong", "version": "1.0.0"})
                
            else:
                send_message({"status": "error", "message": "Unknown command"})
                
        except Exception as e:
            send_message({"status": "error", "message": str(e)})

if __name__ == '__main__':
    main()
