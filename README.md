# Grepolis Building Templates UserScript

## Overview

Grepolis Building Templates is a UserScript designed to enhance the building management experience in Grepolis, a browser-based strategy game. It provides visual hints for building requirements and allows players to create and manage building templates for their town groups.

## Features

- Automatically highlights buildings that need upgrading or downgrading based on user-defined templates.
- Provides visual cues for building requirements when upgrading.
- Allows creation and management of building templates for different town groups.
- Supports default templates for quick setup.
- Validates special building constraints (only one left/right special building allowed).

## Installation

1. Make sure you have a UserScript manager installed in your browser. Popular options include:
   - Tampermonkey for Chrome, Microsoft Edge, Safari, Opera Next, and Firefox
   - Greasemonkey for Firefox
   - Violentmonkey for Chrome, Firefox, and Microsoft Edge

2. Click on the following link to install the script:
   [Install Grepolis Building Templates](link-to-your-script.user.js)

   Alternatively, you can copy the entire script and manually create a new script in your UserScript manager.

3. The script should now be active when you visit the Grepolis game page.

## Usage

### Viewing Building Recommendations

1. Navigate to the Building Overview page in Grepolis.
2. The script will automatically highlight buildings based on your saved templates:
   - Green: Building needs to be upgraded
   - Orange: Building can be downgraded
   - Red: Special building that needs to be demolished

### Managing Building Templates

1. On the Building Overview page, look for the "Building Templates" button at the bottom of the page.
2. Click the button to open the Building Templates window.
3. Select a town group from the dropdown menu.
4. Set the desired levels for each building.
5. Click "Save Group Template" to save your template.

### Using Default Templates

1. In the Building Templates window, select a default template from the dropdown menu.
2. The building levels will be automatically populated.
3. You can then modify the levels if needed and save the template.

## Compatibility

This script is designed to work with the following Grepolis domains:
- `*.grepolis.com`

It excludes the forum and wiki pages to avoid potential conflicts.
