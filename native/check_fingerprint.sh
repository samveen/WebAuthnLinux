#!/bin/bash

echo "=== WebAuthnLinux Fingerprint & FIDO2 Verification Tool ==="

# 1. Check for fprintd
echo -n "[1] Checking fprintd... "
if command -v fprintd-verify >/dev/null 2>&1; then
    echo "INSTALLED"
else
    echo "MISSING"
    echo "    -> Install with: sudo apt install fprintd libpam-fprintd"
fi

# 2. Check for enrolled fingerprints
echo -n "[2] Checking enrolled fingerprints for $USER... "
if command -v fprintd-list >/dev/null 2>&1; then
    FPRINT_LIST=$(fprintd-list "$USER" 2>&1)
    if [[ "$FPRINT_LIST" == *"No fingerprints enrolled"* ]]; then
        echo "NONE ENROLLED"
        echo "    -> Enroll with: fprintd-enroll"
    else
        echo "FOUND"
        echo "    -> $FPRINT_LIST"
    fi
else
    echo "SKIPPED (fprintd missing)"
fi

# 3. Check for libfido2 tools
echo -n "[3] Checking fido2-tools... "
if command -v fido2-token >/dev/null 2>&1; then
    echo "INSTALLED"
    echo "    [3a] Checking visible FIDO2 devices (needs sudo usually)..."
    # Try running fido2-token -L
    sudo fido2-token -L
else
    echo "MISSING"
    echo "    -> Install with: sudo apt install fido2-tools"
fi

# 4. Check PCSCD service
echo -n "[4] Checking pcscd service... "
if systemctl is-active --quiet pcscd; then
    echo "RUNNING"
else
    echo "NOT RUNNING"
    echo "    -> Start with: sudo systemctl start pcscd"
fi

echo "==================================================="
echo "If checks passed but browser fails:"
echo "1. Ensure udev rules are installed (apt install libu2f-udev)"
echo "2. Check Firefox about:config settings (security.webauth.u2f = true)"
