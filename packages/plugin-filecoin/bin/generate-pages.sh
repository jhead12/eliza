#!/bin/bash

# Define source and destination directories
TEMPLATE_DIR="packages/plugin-filecoin/templates"
CLIENT_SRC="client/src"

# Function to copy template files
copy_template() {
    local src="$1"
    local dest="$2"
    cp "$src" "$dest"
}

# Copy login page template
login_page_src="${TEMPLATE_DIR}/login.tsx"
login_page_dest="${CLIENT_SRC}/routes/login.tsx"
copy_template "$login_page_src" "$login_page_dest"

# Copy additional route template
additional_route_src="${TEMPLATE_DIR}/additional-route.tsx"
additional_route_dest="${CLIENT_SRC}/routes/additional-route.tsx"
copy_template "$additional_route_src" "$additional_route_dest"

echo "Templates copied successfully!"